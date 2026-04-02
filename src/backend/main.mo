import List "mo:core/List";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  type Timestamp = Time.Time;

  type Profile = {
    username : Text;
    bio : Text;
    profilePicture : Storage.ExternalBlob;
  };

  type Post = {
    id : Nat;
    author : Principal;
    authorUsername : Text;
    image : Storage.ExternalBlob;
    caption : Text;
    timestamp : Timestamp;
  };

  type Like = {
    user : Principal;
    postId : Nat;
  };

  type Comment = {
    id : Nat;
    postId : Nat;
    author : Principal;
    authorUsername : Text;
    text : Text;
    timestamp : Timestamp;
  };

  type Follow = {
    follower : Principal;
    following : Principal;
  };

  type Reel = {
    id : Nat;
    author : Principal;
    authorUsername : Text;
    video : Storage.ExternalBlob;
    caption : Text;
    timestamp : Timestamp;
  };

  type ReelLike = {
    user : Principal;
    reelId : Nat;
  };

  type ReelComment = {
    id : Nat;
    reelId : Nat;
    author : Principal;
    authorUsername : Text;
    text : Text;
    timestamp : Timestamp;
  };

  type Message = {
    id : Nat;
    sender : Principal;
    recipient : Principal;
    text : Text;
    timestamp : Timestamp;
  };

  module Post {
    public func compare(post1 : Post, post2 : Post) : Order.Order {
      Nat.compare(post1.id, post2.id);
    };
  };

  module Comment {
    public func compare(comment1 : Comment, comment2 : Comment) : Order.Order {
      Nat.compare(comment1.id, comment2.id);
    };
  };

  module Profile {
    public func compare(profile1 : Profile, profile2 : Profile) : Order.Order {
      Text.compare(profile1.username, profile2.username);
    };
  };

  module Reel {
    public func compare(r1 : Reel, r2 : Reel) : Order.Order {
      Nat.compare(r1.id, r2.id);
    };
  };

  module ReelComment {
    public func compare(c1 : ReelComment, c2 : ReelComment) : Order.Order {
      Nat.compare(c1.id, c2.id);
    };
  };

  module Message {
    public func compare(m1 : Message, m2 : Message) : Order.Order {
      Nat.compare(m1.id, m2.id);
    };
  };

  type PostFilter = {
    #all;
    #byUser : Principal;
  };

  let profiles = Map.empty<Principal, Profile>();
  let posts = Map.empty<Nat, Post>();
  let likes = Map.empty<Nat, Like>();
  let comments = Map.empty<Nat, Comment>();
  let follows = Map.empty<Nat, Follow>();
  let reels = Map.empty<Nat, Reel>();
  let reelLikes = Map.empty<Nat, ReelLike>();
  let reelComments = Map.empty<Nat, ReelComment>();
  let messages = Map.empty<Nat, Message>();

  var nextPostId = 0;
  var nextLikeId = 0;
  var nextCommentId = 0;
  var nextFollowId = 0;
  var nextReelId = 0;
  var nextReelLikeId = 0;
  var nextReelCommentId = 0;
  var nextMessageId = 0;

  // User Profiles
  public query ({ caller }) func getCallerUserProfile() : async ?Profile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access their profile");
    };
    profiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : Profile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?Profile {
    profiles.get(user);
  };

  public shared ({ caller }) func updateProfile(username : Text, bio : Text, profilePicture : Storage.ExternalBlob) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };
    let profile : Profile = {
      username;
      bio;
      profilePicture;
    };
    profiles.add(caller, profile);
  };

  public query ({ caller }) func getProfile(user : Principal) : async Profile {
    switch (profiles.get(user)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile };
    };
  };

  public query ({ caller }) func getAllProfiles() : async [Profile] {
    profiles.values().toArray().sort();
  };

  // Posts
  public shared ({ caller }) func createPost(image : Storage.ExternalBlob, caption : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };

    let authorUsername = switch (profiles.get(caller)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile.username };
    };

    let postId = nextPostId;
    let post : Post = {
      id = postId;
      author = caller;
      authorUsername;
      image;
      caption;
      timestamp = Time.now();
    };
    posts.add(postId, post);
    nextPostId += 1;
    postId;
  };

  public query ({ caller }) func getPost(postId : Nat) : async Post {
    switch (posts.get(postId)) {
      case (null) { Runtime.trap("Post does not exist") };
      case (?post) { post };
    };
  };

  func getPostsByFilter(filter : PostFilter) : [Post] {
    let allPosts = posts.values().toArray();
    let filteredPosts = switch (filter) {
      case (#all) { allPosts };
      case (#byUser(user)) {
        allPosts.filter(
          func(post) {
            post.author == user;
          }
        );
      };
    };
    filteredPosts.sort().reverse();
  };

  public query ({ caller }) func getAllPosts() : async [Post] {
    getPostsByFilter(#all);
  };

  public query ({ caller }) func getPostsByUser(user : Principal) : async [Post] {
    getPostsByFilter(#byUser(user));
  };

  // Likes
  public shared ({ caller }) func toggleLike(postId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };
    let existingLikeId = likes.entries().toArray().find(
      func((id, like)) {
        like.user == caller and like.postId == postId;
      }
    );

    switch (existingLikeId) {
      case (null) {
        let likeId = nextLikeId;
        let like : Like = {
          user = caller;
          postId;
        };
        likes.add(likeId, like);
        nextLikeId += 1;
      };
      case (?(id, _)) {
        likes.remove(id);
      };
    };
  };

  public query ({ caller }) func getLikeCount(postId : Nat) : async Nat {
    let count = likes.values().toArray().filter(
      func(like) {
        like.postId == postId;
      }
    ).size();
    count;
  };

  public query ({ caller }) func hasLiked(postId : Nat) : async Bool {
    likes.values().toArray().find(
      func(like) {
        like.user == caller and like.postId == postId;
      }
    ) != null;
  };

  // Comments
  public shared ({ caller }) func addComment(postId : Nat, text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };

    let authorUsername = switch (profiles.get(caller)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile.username };
    };

    let commentId = nextCommentId;
    let comment : Comment = {
      id = commentId;
      postId;
      author = caller;
      authorUsername;
      text;
      timestamp = Time.now();
    };
    comments.add(commentId, comment);
    nextCommentId += 1;
    commentId;
  };

  public query ({ caller }) func getComments(postId : Nat) : async [Comment] {
    let commentsArray = comments.values().toArray().filter(
      func(comment) {
        comment.postId == postId;
      }
    );
    commentsArray.sort();
  };

  // Follows
  public shared ({ caller }) func toggleFollow(following : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };
    let existingFollowId = follows.entries().toArray().find(
      func((id, follow)) {
        follow.follower == caller and follow.following == following;
      }
    );

    switch (existingFollowId) {
      case (null) {
        let followId = nextFollowId;
        let follow : Follow = {
          follower = caller;
          following;
        };
        follows.add(followId, follow);
        nextFollowId += 1;
      };
      case (?(id, _)) {
        follows.remove(id);
      };
    };
  };

  public query ({ caller }) func getFollowerCount(user : Principal) : async Nat {
    let count = follows.values().toArray().filter(
      func(follow) {
        follow.following == user;
      }
    ).size();
    count;
  };

  public query ({ caller }) func getFollowers(user : Principal) : async [Principal] {
    let followers = follows.values().toArray().filter(
      func(follow) {
        follow.following == user;
      }
    ).map(
      func(follow) { follow.follower }
    );
    followers;
  };

  public query ({ caller }) func getFollowingCount(user : Principal) : async Nat {
    let count = follows.values().toArray().filter(
      func(follow) {
        follow.follower == user;
      }
    ).size();
    count;
  };

  public query ({ caller }) func isFollowing(user : Principal) : async Bool {
    follows.values().toArray().find(
      func(follow) {
        follow.follower == caller and follow.following == user;
      }
    ) != null;
  };

  public query ({ caller }) func getFollowing(user : Principal) : async [Principal] {
    let following = follows.values().toArray().filter(
      func(follow) {
        follow.follower == user;
      }
    ).map(
      func(follow) { follow.following }
    );
    following;
  };

  // Search Functions
  public query ({ caller }) func searchUsers(searchQuery : Text) : async [(Principal, Profile)] {
    let lowerQuery = searchQuery.toLower();
    let results = List.empty<(Principal, Profile)>();

    for ((principal, profile) in profiles.entries()) {
      let lowerUsername = profile.username.toLower();
      if (lowerUsername.contains(#text lowerQuery)) {
        results.add((principal, profile));
      };
    };
    results.toArray();
  };

  public query ({ caller }) func searchPosts(searchQuery : Text) : async [Post] {
    let lowerQuery = searchQuery.toLower();
    let results = List.empty<Post>();

    for (post in posts.values()) {
      let lowerCaption = post.caption.toLower();
      if (lowerCaption.contains(#text lowerQuery)) {
        results.add(post);
      };
    };
    results.toArray();
  };

  public query ({ caller }) func getSuggestedUsers() : async [(Principal, Profile)] {
    let suggested = List.empty<(Principal, Profile)>();

    for ((principal, profile) in profiles.entries()) {
      if (principal != caller and not isFollowingInternal(caller, principal)) {
        suggested.add((principal, profile));
        if (suggested.size() >= 20) {
          return suggested.toArray();
        };
      };
    };
    suggested.toArray();
  };

  func isFollowingInternal(follower : Principal, following : Principal) : Bool {
    for (follow in follows.values()) {
      if (follow.follower == follower and follow.following == following) {
        return true;
      };
    };
    false;
  };

  // ============================================================
  // REELS
  // ============================================================

  public shared ({ caller }) func createReel(video : Storage.ExternalBlob, caption : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };

    let authorUsername = switch (profiles.get(caller)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile.username };
    };

    let reelId = nextReelId;
    let reel : Reel = {
      id = reelId;
      author = caller;
      authorUsername;
      video;
      caption;
      timestamp = Time.now();
    };
    reels.add(reelId, reel);
    nextReelId += 1;
    reelId;
  };

  public query ({ caller }) func getAllReels() : async [Reel] {
    reels.values().toArray().sort().reverse();
  };

  public query ({ caller }) func getReelsByUser(user : Principal) : async [Reel] {
    reels.values().toArray().filter(
      func(reel) { reel.author == user }
    ).sort().reverse();
  };

  public shared ({ caller }) func toggleReelLike(reelId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };
    let existingId = reelLikes.entries().toArray().find(
      func((id, like)) {
        like.user == caller and like.reelId == reelId;
      }
    );
    switch (existingId) {
      case (null) {
        let likeId = nextReelLikeId;
        reelLikes.add(likeId, { user = caller; reelId });
        nextReelLikeId += 1;
      };
      case (?(id, _)) {
        reelLikes.remove(id);
      };
    };
  };

  public query ({ caller }) func hasLikedReel(reelId : Nat) : async Bool {
    reelLikes.values().toArray().find(
      func(like) { like.user == caller and like.reelId == reelId }
    ) != null;
  };

  public query ({ caller }) func getReelLikeCount(reelId : Nat) : async Nat {
    reelLikes.values().toArray().filter(
      func(like) { like.reelId == reelId }
    ).size();
  };

  public shared ({ caller }) func addReelComment(reelId : Nat, text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };

    let authorUsername = switch (profiles.get(caller)) {
      case (null) { Runtime.trap("Profile does not exist") };
      case (?profile) { profile.username };
    };

    let commentId = nextReelCommentId;
    let comment : ReelComment = {
      id = commentId;
      reelId;
      author = caller;
      authorUsername;
      text;
      timestamp = Time.now();
    };
    reelComments.add(commentId, comment);
    nextReelCommentId += 1;
    commentId;
  };

  public query ({ caller }) func getReelComments(reelId : Nat) : async [ReelComment] {
    reelComments.values().toArray().filter(
      func(c) { c.reelId == reelId }
    ).sort();
  };

  // ============================================================
  // DIRECT MESSAGES (Chat)
  // ============================================================

  public shared ({ caller }) func sendMessage(recipient : Principal, text : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only authenticated users can call this");
    };

    let msgId = nextMessageId;
    let msg : Message = {
      id = msgId;
      sender = caller;
      recipient;
      text;
      timestamp = Time.now();
    };
    messages.add(msgId, msg);
    nextMessageId += 1;
    msgId;
  };

  public query ({ caller }) func getConversation(otherUser : Principal) : async [Message] {
    messages.values().toArray().filter(
      func(msg) {
        (msg.sender == caller and msg.recipient == otherUser) or
        (msg.sender == otherUser and msg.recipient == caller)
      }
    ).sort();
  };

  public query ({ caller }) func getConversations() : async [Principal] {
    let seen = Map.empty<Principal, Bool>();
    let result = List.empty<Principal>();

    for (msg in messages.values()) {
      if (msg.sender == caller) {
        if (seen.get(msg.recipient) == null) {
          seen.add(msg.recipient, true);
          result.add(msg.recipient);
        };
      } else if (msg.recipient == caller) {
        if (seen.get(msg.sender) == null) {
          seen.add(msg.sender, true);
          result.add(msg.sender);
        };
      };
    };
    result.toArray();
  };
};

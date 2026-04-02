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

  type PostFilter = {
    #all;
    #byUser : Principal;
  };

  let profiles = Map.empty<Principal, Profile>();
  let posts = Map.empty<Nat, Post>();
  let likes = Map.empty<Nat, Like>();
  let comments = Map.empty<Nat, Comment>();
  let follows = Map.empty<Nat, Follow>();

  var nextPostId = 0;
  var nextLikeId = 0;
  var nextCommentId = 0;
  var nextFollowId = 0;

  // User Profiles - Required functions for frontend
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

  // Legacy profile functions
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
};

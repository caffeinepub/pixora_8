import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Reel {
    id: bigint;
    authorUsername: string;
    video: ExternalBlob;
    author: Principal;
    timestamp: Timestamp;
    caption: string;
}
export type Timestamp = bigint;
export interface ReelComment {
    id: bigint;
    authorUsername: string;
    text: string;
    author: Principal;
    timestamp: Timestamp;
    reelId: bigint;
}
export interface Comment {
    id: bigint;
    authorUsername: string;
    text: string;
    author: Principal;
    timestamp: Timestamp;
    postId: bigint;
}
export interface Post {
    id: bigint;
    authorUsername: string;
    author: Principal;
    timestamp: Timestamp;
    caption: string;
    image: ExternalBlob;
}
export interface Message {
    id: bigint;
    text: string;
    recipient: Principal;
    sender: Principal;
    timestamp: Timestamp;
}
export interface Profile {
    bio: string;
    username: string;
    profilePicture: ExternalBlob;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(postId: bigint, text: string): Promise<bigint>;
    addReelComment(reelId: bigint, text: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPost(image: ExternalBlob, caption: string): Promise<bigint>;
    createReel(video: ExternalBlob, caption: string): Promise<bigint>;
    getAllPosts(): Promise<Array<Post>>;
    getAllProfiles(): Promise<Array<Profile>>;
    getAllReels(): Promise<Array<Reel>>;
    getCallerUserProfile(): Promise<Profile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(postId: bigint): Promise<Array<Comment>>;
    getConversation(otherUser: Principal): Promise<Array<Message>>;
    getConversations(): Promise<Array<Principal>>;
    getFollowerCount(user: Principal): Promise<bigint>;
    getFollowers(user: Principal): Promise<Array<Principal>>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getFollowingCount(user: Principal): Promise<bigint>;
    getLikeCount(postId: bigint): Promise<bigint>;
    getPost(postId: bigint): Promise<Post>;
    getPostsByUser(user: Principal): Promise<Array<Post>>;
    getProfile(user: Principal): Promise<Profile>;
    getReelComments(reelId: bigint): Promise<Array<ReelComment>>;
    getReelLikeCount(reelId: bigint): Promise<bigint>;
    getReelsByUser(user: Principal): Promise<Array<Reel>>;
    getSuggestedUsers(): Promise<Array<[Principal, Profile]>>;
    getUserProfile(user: Principal): Promise<Profile | null>;
    hasLiked(postId: bigint): Promise<boolean>;
    hasLikedReel(reelId: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(user: Principal): Promise<boolean>;
    saveCallerUserProfile(profile: Profile): Promise<void>;
    searchPosts(searchQuery: string): Promise<Array<Post>>;
    searchUsers(searchQuery: string): Promise<Array<[Principal, Profile]>>;
    sendMessage(recipient: Principal, text: string): Promise<bigint>;
    toggleFollow(following: Principal): Promise<void>;
    toggleLike(postId: bigint): Promise<void>;
    toggleReelLike(reelId: bigint): Promise<void>;
    updateProfile(username: string, bio: string, profilePicture: ExternalBlob): Promise<void>;
}

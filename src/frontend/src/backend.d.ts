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
export type Timestamp = bigint;
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
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPost(image: ExternalBlob, caption: string): Promise<bigint>;
    getAllPosts(): Promise<Array<Post>>;
    getAllProfiles(): Promise<Array<Profile>>;
    getCallerUserProfile(): Promise<Profile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComments(postId: bigint): Promise<Array<Comment>>;
    getFollowerCount(user: Principal): Promise<bigint>;
    getFollowing(user: Principal): Promise<Array<Principal>>;
    getFollowingCount(user: Principal): Promise<bigint>;
    getLikeCount(postId: bigint): Promise<bigint>;
    getPost(postId: bigint): Promise<Post>;
    getPostsByUser(user: Principal): Promise<Array<Post>>;
    getProfile(user: Principal): Promise<Profile>;
    getUserProfile(user: Principal): Promise<Profile | null>;
    hasLiked(postId: bigint): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    isFollowing(user: Principal): Promise<boolean>;
    saveCallerUserProfile(profile: Profile): Promise<void>;
    toggleFollow(following: Principal): Promise<void>;
    toggleLike(postId: bigint): Promise<void>;
    updateProfile(username: string, bio: string, profilePicture: ExternalBlob): Promise<void>;
}

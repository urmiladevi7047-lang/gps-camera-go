import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Photo {
    latitude: number;
    title: string;
    longitude: number;
    timestamp: Time;
}
export type Time = bigint;
export interface backendInterface {
    addPhoto(title: string, latitude: number, longitude: number): Promise<void>;
    getPhotos(): Promise<Array<Photo>>;
    getPhotosSorted(): Promise<Array<Photo>>;
}

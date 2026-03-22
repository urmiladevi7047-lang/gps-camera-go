import Map "mo:core/Map";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";

actor {
  type Photo = {
    title : Text;
    latitude : Float;
    longitude : Float;
    timestamp : Time.Time;
  };

  module Photo {
    public func compare(photo1 : Photo, photo2 : Photo) : Order.Order {
      Nat.compare(photo1.timestamp.toNat(), photo2.timestamp.toNat());
    };
  };

  let photoStore = Map.empty<Principal, [Photo]>();

  public query ({ caller }) func getPhotos() : async [Photo] {
    switch (photoStore.get(caller)) {
      case (null) {
        [];
      };
      case (?photos) {
        photos;
      };
    };
  };

  public shared ({ caller }) func addPhoto(title : Text, latitude : Float, longitude : Float) : async () {
    let newPhoto : Photo = {
      title;
      latitude;
      longitude;
      timestamp = Time.now();
    };

    let updatedPhotos = switch (photoStore.get(caller)) {
      case (null) { [newPhoto] };
      case (?existingPhotos) {
        [newPhoto].concat(existingPhotos);
      };
    };

    photoStore.add(caller, updatedPhotos);
  };

  public query ({ caller }) func getPhotosSorted() : async [Photo] {
    switch (photoStore.get(caller)) {
      case (null) { [] };
      case (?photos) {
        photos.sort();
      };
    };
  };
};

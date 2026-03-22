import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Photo } from "../backend";
import { useActor } from "./useActor";

export function useGetPhotos() {
  const { actor, isFetching } = useActor();
  return useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPhotosSorted();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPhoto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      latitude,
      longitude,
    }: {
      title: string;
      latitude: number;
      longitude: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.addPhoto(title, latitude, longitude);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}

// Publish only after the business supplies and approves the supporting facts.
export type Achievement = { id: string; value: string; label: string; verified: boolean };
export type LeaderMessage = {
  id: string;
  name: string;
  designation: string;
  message: string;
  portrait?: { src: string; alt: string };
  verified: boolean;
};

export const achievements: Achievement[] = [];
export const leadershipMessages: LeaderMessage[] = [];

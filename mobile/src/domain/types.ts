export type Coordinate = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  altitudeMeters?: number | null;
  headingDegrees?: number | null;
  speedMetersPerSecond?: number | null;
  recordedAt?: string;
};

export type PlaceGeometry =
  | {
      type: "circle";
      center: Coordinate;
      radiusMeters: number;
    }
  | {
      type: "point";
      lat: number;
      lng: number;
    }
  | {
      type: "polygon";
      coordinates: Coordinate[];
    };

export type Place = {
  id: string;
  name: string;
  category: string;
  description?: string;
  geometry: PlaceGeometry;
  qrCode?: string | null;
};

export type MapMarker = {
  id: string;
  coordinate: Coordinate;
  title: string;
  description?: string;
  tone?: "destination" | "next" | "completed";
};

export type RewardConfig = {
  type: string;
  amount: number;
  currency: string;
  description: string;
  expiresInDays?: number;
};

export type PlanStepSummary = {
  id: string;
  type: "enter_area" | "via" | "stay" | "qr_checkin" | "time_window";
  title?: string;
  placeId?: string;
  minMinutes?: number | null;
};

export type PlanCandidate = {
  id: string;
  title: string;
  objective?: string;
  sponsorName?: string;
  durationMinutes?: number;
  walkingDistanceMeters?: number;
  crowdingLevel?: string;
  recommendationReason?: string;
  reward?: RewardConfig;
  stepsSummary: PlanStepSummary[];
  distanceMeters?: number | null;
  score: number;
};

export type ActionStepProgress = {
  stepId: string;
  title: string;
  type: string;
  placeId?: string;
  minMinutes?: number | null;
  status: "pending" | "in_progress" | "completed";
  enteredAt?: string | null;
  elapsedSeconds: number;
  completedAt?: string | null;
  verificationMethod?: string | null;
};

export type ActionRun = {
  id: string;
  userId: string;
  planId: string;
  status: "started" | "in_progress" | "completed" | string;
  currentStepIndex: number;
  steps: ActionStepProgress[];
  eventIds: string[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string | null;
  achievementId?: string | null;
};

export type VerificationEventPayload =
  | {
      type: "location";
      lat: number;
      lng: number;
      accuracyMeters?: number;
      recordedAt: string;
    }
  | {
      type: "qr_scan";
      qrCode: string;
      recordedAt: string;
    };

export type ActionEventResult = {
  actionRun: ActionRun;
  event: unknown;
  completedSteps: ActionStepProgress[];
};

export type Reward = {
  id: string;
  userId: string;
  planId: string;
  actionRunId: string;
  achievementId: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  status: "issued" | "redeemed" | string;
  issuedAt: string;
  expiresAt: string;
};

export type TrackedLocation = Coordinate & {
  id: string;
  source: "foreground" | "background";
};

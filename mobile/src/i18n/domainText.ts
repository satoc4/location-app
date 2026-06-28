import type { ActionStepProgress, PlanCandidate, PlanStepSummary, Reward } from "../domain/types";
import type { Locale, TranslationKey } from "./strings";
import { translate } from "./strings";

const demoStepKeyById = {
  step_station_start: "step.stationStart",
  step_shopping_enter: "step.shoppingEnter",
  step_shopping_stay: "step.shoppingStay",
  step_castle_arrive: "step.castleArrive"
} as const;

type DemoStepId = keyof typeof demoStepKeyById;

function stepId(step: PlanStepSummary | ActionStepProgress) {
  return "id" in step ? step.id : step.stepId;
}

export function stepRequiredMinutes(step: PlanStepSummary | ActionStepProgress) {
  if (typeof step.minMinutes === "number") {
    return step.minMinutes;
  }
  return stepId(step) === "step_shopping_stay" ? 10 : 0;
}

export function stepProgressRatio(step: ActionStepProgress) {
  if (step.status === "completed") {
    return 1;
  }
  if (step.type !== "stay") {
    return 0;
  }
  const requiredSeconds = stepRequiredMinutes(step) * 60;
  if (requiredSeconds <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, step.elapsedSeconds / requiredSeconds));
}

export function localizeStatus(locale: Locale, status?: string | null) {
  if (!status) {
    return translate(locale, "common.unknown");
  }
  const statusKeys = {
    pending: "status.pending",
    in_progress: "status.in_progress",
    started: "status.started",
    completed: "status.completed",
    issued: "status.issued",
    redeemed: "status.redeemed"
  } as const;
  if (status in statusKeys) {
    return translate(locale, statusKeys[status as keyof typeof statusKeys]);
  }
  return status;
}

export function localizeCrowding(locale: Locale, value?: string | null) {
  if (value === "low") {
    return translate(locale, "crowding.low");
  }
  return value || translate(locale, "common.open");
}

export function localizePlan(locale: Locale, plan: PlanCandidate) {
  if (plan.id !== "plan_shopping_street_demo") {
    return {
      title: plan.title,
      sponsorName: plan.sponsorName,
      recommendationReason: plan.recommendationReason
    };
  }

  return {
    title: translate(locale, "plan.demo.title"),
    sponsorName: translate(locale, "plan.demo.sponsor"),
    recommendationReason: translate(locale, "plan.demo.reason")
  };
}

export function localizeStepTitle(
  locale: Locale,
  step: PlanStepSummary | ActionStepProgress
) {
  const key = demoStepKeyById[stepId(step) as DemoStepId];
  if (key) {
    return translate(locale, key);
  }
  return step.title;
}

export function localizeStepRequirement(
  locale: Locale,
  step: PlanStepSummary | ActionStepProgress
) {
  if (step.type === "stay") {
    return translate(locale, "step.requirement.stay", {
      minutes: stepRequiredMinutes(step)
    });
  }

  const keyByType: Record<string, TranslationKey> = {
    enter_area: "step.requirement.enter_area",
    via: "step.requirement.via",
    qr_checkin: "step.requirement.qr_checkin",
    time_window: "step.requirement.time_window"
  };
  const key = keyByType[step.type];
  return key ? translate(locale, key) : step.type;
}

export function localizeStepProgress(locale: Locale, step: ActionStepProgress) {
  if (step.status === "completed") {
    return translate(locale, "step.progress.completed");
  }
  if (step.type === "stay") {
    const required = stepRequiredMinutes(step);
    const elapsed = Math.floor(step.elapsedSeconds / 60);
    return translate(locale, "step.progress.stay", { elapsed, required });
  }
  return translate(locale, "step.progress.arrivalOnly");
}

export function localizeRewardDescription(locale: Locale, reward: Reward) {
  if (reward.planId === "plan_shopping_street_demo") {
    return translate(locale, "plan.demo.reward");
  }
  return reward.description;
}

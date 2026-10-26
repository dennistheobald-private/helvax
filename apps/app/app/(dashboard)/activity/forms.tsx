"use client";

import { useActionState } from "react";
import { Button } from "@helvax/ui/react";
import type { ReplyCategory } from "@/lib/database.types";
import { reviewOutcome, reviewReply, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state.error) return <p className="form-status form-status--error" role="alert">{state.error}</p>;
  if (state.ok) return <p className="form-status" role="status">{state.ok}</p>;
  return null;
}

export function ReplyReviewForm({ analysis, current }: { analysis: string; current: ReplyCategory }) {
  const [state, action, pending] = useActionState(reviewReply, {});
  return (
    <form action={action} className="review-form">
      <input type="hidden" name="analysis" value={analysis} />
      <fieldset className="hx-fieldset">
        <legend className="hx-label">What does the reply mean?</legend>
        <label className="hx-check"><input type="radio" name="category" value="risky_intent" defaultChecked={current === "risky_intent"} /> <span>Agrees to the risky request<span className="hx-check__hint">Counts as a verified risky action.</span></span></label>
        <label className="hx-check"><input type="radio" name="category" value="verification" defaultChecked={current === "verification"} /> <span>Asks to verify the request<span className="hx-check__hint">Verified safe behaviour.</span></span></label>
        <label className="hx-check"><input type="radio" name="category" value="refusal" defaultChecked={current === "refusal"} /> <span>Refuses the request<span className="hx-check__hint">Verified safe behaviour.</span></span></label>
        <label className="hx-check"><input type="radio" name="category" value="ambiguous" defaultChecked={current === "ambiguous" || current === "neutral"} /> <span>Unclear<span className="hx-check__hint">Stays inconclusive.</span></span></label>
      </fieldset>
      <div className="settings-form__actions"><Button type="submit" loading={pending}>Save review</Button><Status state={state} /></div>
    </form>
  );
}

export function OutcomeReviewForm({ sim }: { sim: string }) {
  const [state, action, pending] = useActionState(reviewOutcome, {});
  return (
    <form action={action} className="review-form">
      <input type="hidden" name="sim" value={sim} />
      <fieldset className="hx-fieldset">
        <legend className="hx-label">Your decision</legend>
        <label className="hx-check"><input type="radio" name="decision" value="confirm" required /> <span>Confirm as a verified risky action<span className="hx-check__hint">For example, the employee told you they entered details.</span></span></label>
        <label className="hx-check"><input type="radio" name="decision" value="dismiss" /> <span>Dismiss as inconclusive<span className="hx-check__hint">For example, a security tool or a colleague opened the page.</span></span></label>
      </fieldset>
      <div className="hx-field">
        <label className="hx-label" htmlFor="note">Reason</label>
        <textarea id="note" name="note" className="hx-input" rows={3} required minLength={5} maxLength={500} placeholder="What you checked and why" />
      </div>
      <div className="settings-form__actions"><Button type="submit" loading={pending}>Save decision</Button><Status state={state} /></div>
    </form>
  );
}

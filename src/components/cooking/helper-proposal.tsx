import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import type { CookingRoomData } from "./cooking-session";
import { Button } from "@/components/ui/button";
import { CookingMarkdown } from "./cooking-markdown";

export type HelperProposal = FunctionReturnType<typeof api.cookingAssistance.listProposals>[number];
type Plan = NonNullable<CookingRoomData["room"]["plan"]>;

export function HelperProposalCard({
  proposal,
  currentPlan,
  disabled,
  onApprove,
  onReject,
}: {
  proposal: HelperProposal;
  currentPlan: Plan;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const removedSteps = currentPlan.steps.filter(
    (step) => !proposal.plan.steps.some((next) => next.id === step.id),
  );
  const changedIngredients = proposal.plan.ingredients.filter((item) => {
    const current = currentPlan.ingredients.find((candidate) => candidate.id === item.id);
    return !current || current.name !== item.name || current.amount !== item.amount;
  });
  const removedIngredients = currentPlan.ingredients.filter(
    (item) => !proposal.plan.ingredients.some((next) => next.id === item.id),
  );
  return (
    <article className="helper-proposal" aria-label="Зміни до рецепта">
      <strong>
        {proposal.status === "approved" ? "Рецепт оновлено" : "Пропоную змінити рецепт"}
      </strong>
      <CookingMarkdown text={proposal.preview} />
      {proposal.status === "open" && (
        <>
          <details>
            <summary>Що зміниться</summary>
            <div className="helper-proposal-details">
              {proposal.plan.servings !== currentPlan.servings && (
                <p>Порцій буде: {proposal.plan.servings}</p>
              )}
              {removedIngredients.length > 0 && (
                <p>Приберемо: {removedIngredients.map((item) => item.name).join(", ")}.</p>
              )}
              {changedIngredients.length > 0 && (
                <ul>
                  {changedIngredients.map((item) => (
                    <li key={item.id}>
                      {item.name}: {item.amount}
                    </li>
                  ))}
                </ul>
              )}
              {removedSteps.length > 0 && (
                <p>Пропустимо: {removedSteps.map((step) => step.title).join(", ")}.</p>
              )}
              {proposal.plan.steps
                .filter((step) => proposal.affectedStepKeys.includes(step.id))
                .map((step) => (
                  <section key={step.id}>
                    <h3>{step.title}</h3>
                    <CookingMarkdown text={step.body} />
                  </section>
                ))}
            </div>
          </details>
          <div className="helper-proposal-actions">
            <Button disabled={disabled} onClick={onApprove}>
              Застосувати зміни
            </Button>
            <Button variant="ghost" disabled={disabled} onClick={onReject}>
              Залишити як є
            </Button>
          </div>
        </>
      )}
      {proposal.status === "approved" && (
        <p className="helper-receipt">Зміни вже бачать усі кухарі.</p>
      )}
      {proposal.status === "rejected" && (
        <p className="helper-receipt">Залишили рецепт без змін.</p>
      )}
      {proposal.status === "stale" && (
        <p className="helper-receipt">Ви вже просунулися далі. Попроси оновити цю пропозицію.</p>
      )}
    </article>
  );
}

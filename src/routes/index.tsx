import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import ChefHatIcon from "@hugeicons/core-free-icons/ChefHatIcon";
import CookingPotIcon from "@hugeicons/core-free-icons/CookingPotIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { api } from "../../convex/_generated/api";
import { AI_REQUEST_MAX_CHARACTERS } from "../../convex/lib/ai_config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isConvexConfigured } from "@/lib/convex";
import { pickQuickPrompts, type QuickPrompt } from "@/lib/quick-prompts";

type GenerateResult = { ok: true; text: string } | { ok: false; message: string };

type OutputState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; text: string }
  | { kind: "error"; message: string };

type PromptSelection = Readonly<{
  promptId: string;
  baseRequest: string;
}>;

// Sits above the ~25s server timeout so a hung transport cannot stay in loading forever.
const generateDeadlineMs = 40_000;
const counterThreshold = Math.floor(AI_REQUEST_MAX_CHARACTERS * 0.8);
const shakeDurationMs = 300;

function MissingConvexHome() {
  return (
    <HomeScreen
      backendReady={false}
      onGenerate={async () => ({
        ok: false,
        message: "Convex ще не налаштований. Запусти bunx convex dev.",
      })}
    />
  );
}

function ConnectedHome() {
  const generateIdea = useAction(api.ai.generate);
  const status = useQuery(api.status.current);

  return <HomeScreen backendReady={status?.ready === true} onGenerate={generateIdea} />;
}

function HomeScreen({
  backendReady,
  onGenerate,
}: {
  backendReady: boolean;
  onGenerate: (request: { request: string }) => Promise<GenerateResult>;
}) {
  const [request, setRequest] = useState("");
  const [selection, setSelection] = useState<PromptSelection | null>(null);
  const [quickPrompts] = useState(() => pickQuickPrompts());
  const [output, setOutput] = useState<OutputState>({ kind: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = output.kind === "loading";
  const overLimit = request.length > AI_REQUEST_MAX_CHARACTERS;
  const showCounter = request.length >= counterThreshold;

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea || CSS.supports("field-sizing", "content")) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [request]);

  useEffect(() => {
    if (output.kind !== "success" && output.kind !== "error") {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [output]);

  function shakeComposer() {
    const composer = composerRef.current;

    if (!composer) {
      return;
    }

    composer.classList.remove("is-shaking");
    void composer.offsetWidth;
    composer.classList.add("is-shaking");
    window.setTimeout(() => composer.classList.remove("is-shaking"), shakeDurationMs);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedRequest = request.trim();

    if (isLoading) {
      return;
    }

    if (overLimit) {
      shakeComposer();
      textareaRef.current?.focus();
      return;
    }

    if (!trimmedRequest) {
      textareaRef.current?.focus();
      return;
    }

    textareaRef.current?.blur();
    setOutput({ kind: "loading" });

    const deadline = new Promise<GenerateResult>((resolve) => {
      setTimeout(
        () => resolve({ ok: false, message: "Відповідь не прийшла вчасно. Спробуй ще раз." }),
        generateDeadlineMs,
      );
    });

    try {
      const result = await Promise.race([onGenerate({ request: trimmedRequest }), deadline]);
      setOutput(
        result.ok
          ? { kind: "success", text: result.text }
          : { kind: "error", message: result.message },
      );
    } catch {
      setOutput({
        kind: "error",
        message: "Не вдалося звернутися до ШІ. Спробуй ще раз.",
      });
    }
  }

  function handlePrompt(prompt: QuickPrompt) {
    if (selection?.promptId === prompt.id) {
      setRequest(selection.baseRequest);
      setSelection(null);
      return;
    }

    const baseRequest = selection ? selection.baseRequest : request;
    const trimmedBase = baseRequest.trim();
    setRequest(trimmedBase ? `${trimmedBase}\n${prompt.label}` : prompt.label);
    setSelection({ promptId: prompt.id, baseRequest });
  }

  return (
    <main className="app-shell">
      <div className="checker-band" aria-hidden />
      <div className="home-layout">
        <header className="topbar">
          <div className="brand" data-backend-ready={backendReady}>
            <i aria-hidden />
            Multiplayer Cooking
          </div>
        </header>

        <div className="sign">
          <h1>Що готуємо сьогодні?</h1>
        </div>

        <form
          ref={composerRef}
          className="composer chrome t-input"
          data-over-limit={overLimit}
          onSubmit={handleSubmit}
        >
          <label className="sr-only" htmlFor="cooking-request">
            Що хочеш приготувати
          </label>
          <Textarea
            ref={textareaRef}
            id="cooking-request"
            name="request"
            variant="ghost"
            value={request}
            readOnly={isLoading}
            aria-invalid={overLimit}
            placeholder="Опиши страву або напиши, що є вдома"
            className="request-textarea"
            onChange={(event) => {
              setRequest(event.target.value);
              setSelection(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="composer-actions">
            <span className="character-count" data-over-limit={overLimit} aria-live="polite">
              {showCounter ? `${request.length}/${AI_REQUEST_MAX_CHARACTERS}` : null}
              {overLimit && <span className="sr-only">, забагато знаків</span>}
            </span>
            <Button
              type="submit"
              size="xl"
              disabled={overLimit}
              aria-busy={isLoading}
              aria-disabled={isLoading}
              className="generate-button"
            >
              <HugeiconsIcon
                icon={CookingPotIcon}
                className="size-5 pot-icon"
                strokeWidth={1.5}
                aria-hidden
              />
              {isLoading ? "Генеруємо…" : "Згенерувати"}
            </Button>
          </div>
        </form>

        <div className="quick-prompts" role="group" aria-label="Швидкі запити">
          {quickPrompts.map((prompt) => (
            <Button
              key={prompt.id}
              type="button"
              size="chip"
              variant="outline"
              aria-pressed={selection?.promptId === prompt.id}
              disabled={isLoading}
              className="quick-prompt"
              onClick={() => handlePrompt(prompt)}
            >
              <HugeiconsIcon icon={prompt.icon} strokeWidth={1.5} aria-hidden />
              {prompt.label}
            </Button>
          ))}
        </div>

        <div ref={resultRef} className="result-slot">
          <div aria-live="polite">
            {output.kind === "loading" && <LoadingResult />}
            {output.kind === "success" && <SuccessResult text={output.text} />}
          </div>
          {output.kind === "error" && <ErrorResult message={output.message} />}
        </div>
      </div>
    </main>
  );
}

function LoadingResult() {
  return (
    <div className="result-card chrome loading-card">
      <p className="sr-only">Готуємо відповідь</p>
      <span />
      <span />
      <span />
    </div>
  );
}

function SuccessResult({ text }: { text: string }) {
  return (
    <article className="result-card chrome">
      <div className="result-label sign-text">
        <HugeiconsIcon icon={ChefHatIcon} size={16} strokeWidth={1.5} aria-hidden />
        <span>Ідея</span>
      </div>
      <p className="result-copy">{text}</p>
    </article>
  );
}

function ErrorResult({ message }: { message: string }) {
  return (
    <Alert
      variant="destructive"
      className="rounded-[14px] border-2 px-[18px] py-4 has-[>svg]:gap-x-2.5"
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={1.5} aria-hidden />
      <AlertDescription className="text-[0.9375rem] leading-[1.375rem] font-medium">
        {message}
      </AlertDescription>
    </Alert>
  );
}

function HomeRoute() {
  return isConvexConfigured ? <ConnectedHome /> : <MissingConvexHome />;
}

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

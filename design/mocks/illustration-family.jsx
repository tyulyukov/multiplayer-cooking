import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { IdeaPane } from "../../src/components/idea-card";
import { HistoryPanel } from "../../src/components/history-panel";
import { PersonalSettings } from "../../src/components/personal-settings";
import { ConnectCard } from "../../src/components/silpo-connect";
import "../../src/index.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "history";
const now = Date.now();

const baseIdea = {
  _id: "fixture",
  _creationTime: now,
  userId: "fixture",
  threadId: "fixture",
  promptMessageId: "fixture",
  title: "Фокача з куркою",
  summary: "Пухке тісто, соковита курка, чері та моцарела.",
  body: "Замішай тісто й дай йому піднятися. Виклади начинку та випікай до золотистої скоринки.",
  timeMinutes: 45,
  servings: 2,
  ingredients: [
    { name: "Борошно", amount: "300 г" },
    { name: "Куряче філе", amount: "250 г" },
    { name: "Томати чері", amount: "150 г" },
    { name: "Моцарела", amount: "125 г" },
  ],
  products: [],
  productsStatus: "empty",
};

export function FixtureShell({ children }) {
  return (
    <main className="app-shell">
      <div className="checker-band" aria-hidden />
      <div className="page-frame">
        <header className="topbar">
          <div className="brand" data-backend-ready="true">
            <i aria-hidden />Multiplayer Cooking
          </div>
        </header>
      </div>
      <div className="home-layout">{children}</div>
    </main>
  );
}

export function Pane({ idea = baseIdea }) {
  return (
    <div className="illustration-fixture-pane">
      <IdeaPane
        idea={idea}
        canAddToCart
        versions={{ index: 0, count: 1, onSelect: () => {}, onRestore: () => {}, restoring: false, restoreError: null }}
        onAddToCart={() => {}}
        onCookCount={() => Promise.resolve()}
      />
    </div>
  );
}

export function HistoryFixture() {
  return (
    <FixtureShell>
      <h1 className="fixture-title">Порожня історія</h1>
      <HistoryPanel items={[]} onOpen={() => {}} onDelete={() => {}} />
      <p className="fixture-hint">Відкрий «Історія», щоб перевірити Drawer або Sheet.</p>
    </FixtureShell>
  );
}

export function MemoriesFixture() {
  const [open, setOpen] = useState(true);
  return (
    <FixtureShell>
      <PersonalSettings
        open={open}
        onOpenChange={setOpen}
        initialTab="memories"
        memories={[]}
        settings={{ tone: "friendly", customInstructions: "", about: "" }}
        onDelete={() => Promise.resolve()}
        onSave={() => Promise.resolve()}
      />
    </FixtureShell>
  );
}

export function ConnectFixture() {
  return (
    <FixtureShell>
      <div className="sign"><h1>Підключи Сільпо, щоб почати</h1></div>
      <ConnectCard busy={false} onConnect={() => {}} />
    </FixtureShell>
  );
}

export function ImageFixture({ broken }) {
  return (
    <FixtureShell>
      <Pane
        idea={{
          ...baseIdea,
          image: broken ? { storageId: "fixture", generated: true } : undefined,
          imageUrl: broken ? "/missing-dish.webp" : undefined,
          imageError: broken ? undefined : "Не вдалося створити фото. Рецепт збережено, можеш готувати без фото.",
        }}
      />
    </FixtureShell>
  );
}

export function CartFixture() {
  const products = baseIdea.ingredients.map((ingredient, index) => ({
    ingredient: ingredient.name,
    quantity: 1,
    productId: `product-${index}`,
    title: ingredient.name,
    price: 39.99,
    unit: "1 кг",
  }));
  return (
    <FixtureShell>
      <Pane
        idea={{
          ...baseIdea,
          products,
          cart: {
            itemCount: 4, productsTotal: 159.96, deliveryTotal: 49, total: 208.96, addedAt: now,
            checkoutWebLink: "https://silpo.ua/cart",
          },
          cartPending: new URLSearchParams(location.search).has("pending"),
        }}
      />
    </FixtureShell>
  );
}

export function CooksFixture() {
  const [cookCount, setCookCount] = useState();
  return (
    <FixtureShell>
      <div className="illustration-fixture-pane">
        <IdeaPane
          idea={{ ...baseIdea, products: undefined, productsStatus: undefined, cookCount }}
          canAddToCart
          versions={{ index: 0, count: 1, onSelect: () => {}, onRestore: () => {}, restoring: false, restoreError: null }}
          onAddToCart={() => {}}
          onCookCount={(count) => {
            setCookCount(count);
            return Promise.resolve();
          }}
        />
      </div>
    </FixtureShell>
  );
}

const fixtures = {
  history: <HistoryFixture />,
  memories: <MemoriesFixture />,
  connect: <ConnectFixture />,
  image: <ImageFixture broken={false} />,
  broken: <ImageFixture broken />,
  cart: <CartFixture />,
  cooks: <CooksFixture />,
};

createRoot(document.getElementById("root")).render(fixtures[mode] ?? fixtures.history);

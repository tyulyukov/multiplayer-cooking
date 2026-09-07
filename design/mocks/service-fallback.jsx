import React from "react";
import { createRoot } from "react-dom/client";
import { IdeaPane } from "../../src/components/idea-card";
import { HistoryPanel } from "../../src/components/history-panel";
import "../../src/index.css";

const mode = new URLSearchParams(location.search).get("mode") ?? "unavailable";
const idea = {
  _id: "fixture", _creationTime: Date.now(), userId: "fixture", threadId: "fixture", promptMessageId: "fixture",
  title: "Фокача з куркою", summary: "Пухке тісто, соковита курка, чері та моцарела.",
  body: "Замішай тісто й дай йому піднятися. Виклади начинку та випікай до золотистої скоринки.",
  timeMinutes: 45, servings: 2,
  ingredients: [{ name: "Борошно", amount: "300 г" }, { name: "Куряче філе", amount: "250 г" }, { name: "Томати чері", amount: "150 г" }, { name: "Моцарела", amount: "125 г" }],
  products: mode === "partial" ? [{ ingredient: "Борошно", quantity: 1, productId: "flour", title: "Борошно пшеничне", price: 39.99, unit: "1 кг" }] : [],
  productsStatus: mode === "partial" || mode === "matched" ? undefined : mode === "empty" ? "empty" : mode === "needs_address" ? "needs_address" : mode === "not_connected" ? "not_connected" : "unavailable",
  imageError: mode === "image" ? "Не вдалося створити фото. Рецепт збережено, можеш готувати без фото." : undefined,
  ...(mode === "broken" ? {image: {storageId: "fixture", generated: true}, imageUrl: "/missing-dish.webp"} : {}),
};
if (mode === "matched") {
  idea.products = idea.ingredients.map((ingredient, index) => ({
    ingredient: ingredient.name,
    quantity: 1,
    productId: `product-${index}`,
    title: ingredient.name,
    price: 39.99,
    unit: "1 кг",
  }));
}
createRoot(document.getElementById("root")).render(
  <><div className="checker" aria-hidden="true" /><main style={{maxWidth: 620, margin: "24px auto", padding: "0 16px"}}>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}><HistoryPanel items={[{threadId: "fixture", title: idea.title, createdAt: Date.now(), active: true, photos: []}]} onOpen={() => {}} onDelete={() => {}} /></div>
    <IdeaPane idea={idea} canAddToCart versions={{index:0,count:1,onSelect:()=>{},onRestore:()=>{},restoring:false,restoreError:null}} onAddToCart={()=>{}} onCookCount={()=>{}} />
  </main></>
);

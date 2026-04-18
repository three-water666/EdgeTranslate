/** @jsx h */
import { h } from "preact";
import PanelView from "./PanelView.jsx";
import { useResultPanelModel } from "./Panel.controller.js";
export { checkTimestamp } from "./Panel.shared.js";

export default function ResultPanel() {
    return <PanelView {...useResultPanelModel()} />;
}

/** @jsx h */
import { h } from "preact";
import PanelView from "./panel/PanelView.jsx";
import { useResultPanelModel } from "./panel/use_result_panel_model.js";
export { checkTimestamp } from "./panel/panel_shared.js";

export default function ResultPanel() {
    return <PanelView {...useResultPanelModel()} />;
}

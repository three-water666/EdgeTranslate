import styled, { createGlobalStyle } from "styled-components";
import Dropdown from "./Dropdown.jsx";
import PinIcon from "./icons/pin.svg";
import SimpleBarStyle from "simplebar-react/dist/simplebar.min.css";

export const MaxZIndex = 2147483647;
const ColorPrimary = "#4a8cf7";
const PanelBorderRadius = "8px";
export const ContentWrapperCenterClassName = "simplebar-content-wrapper-center";

export const GlobalStyle = createGlobalStyle`
    ${SimpleBarStyle}

    [data-simplebar] {
        width: 100%;
        height: 100%;
        max-height: 100%;
    }

    .simplebar-offset {
        width: 100%;
    }

    .simplebar-track.simplebar-vertical {
        width: 8px;
    }

    .simplebar-track.simplebar-horizontal {
        height: 8px;
    }

    .simplebar-scrollbar:before {
        left: 1px;
        right: 1px;
        border-radius: 8px;
        background-color: rgba(150, 150, 150, 0.8);
    }

    .${ContentWrapperCenterClassName} {
        display: flex;
        flex-direction: column;

        &::before,
        &::after {
            content: "";
            flex: 1;
        }
    }

    .simplebar-content {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
    }
`;

/**
 * @param {{
 *   displayType: "floating" | "fixed";
 * }} props
 */
export const Panel = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    position: fixed;
    top: 0;
    left: 0;
    z-index: ${MaxZIndex};
    border-radius: ${(props) => (props.displayType === "floating" ? PanelBorderRadius : 0)};
    overflow: visible;
    box-shadow: 0px 8px 12px 5px rgba(0, 0, 0, 0.25);
    background: rgba(235, 235, 235, 1);
    padding: 0;
    margin: 0;
    border: none;
    font-size: 16px;
    font-weight: normal;
    color: black;
    line-height: 1;
    -webkit-text-size-adjust: 100%;
    box-sizing: border-box;
    -moz-tab-size: 4;
    tab-size: 4;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif,
        "Apple Color Emoji", "Segoe UI Emoji";

    &:before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        z-index: -1;
        display: block;
        height: 100%;
        border-radius: ${(props) => (props.displayType === "floating" ? PanelBorderRadius : 0)};
    }
`;

export const Head = styled.div`
    padding: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 0 0 auto;
    overflow: visible;
    cursor: grab;
`;

export const HeadIcons = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
`;

export const HeadIcon = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    font-style: normal;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    cursor: pointer;
    font-size: 18px;
    width: 24px;
    height: 24px;
    margin: 2px;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 15px;

    svg {
        fill: #8e8e93;
        width: 16px;
        height: 16px;
        display: block;
        transition: fill 0.2s linear;
    }

    &:hover svg {
        fill: dimgray;
    }
`;

export const StyledPinIcon = styled(PinIcon)`
    transition: transform 0.4s, fill 0.2s linear !important;
    ${(props) => (props.fix ? "" : "transform: rotate(45deg)")}
`;

export const Body = styled.div`
    width: 100%;
    box-sizing: border-box;
    font-weight: normal;
    font-size: medium;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    overflow-x: hidden;
    overflow-y: overlay;
    overscroll-behavior: contain;
    flex-grow: 1;
    flex-shrink: 1;
    word-break: break-word;
`;

export const SourceOption = styled(Dropdown)`
    max-width: 45%;
    font-weight: normal;
    font-size: small;
    cursor: pointer;
    text-align-last: center;
    background-color: transparent;
    border-color: transparent;
    outline: none;
`;

export const Highlight = styled.div`
    height: 100%;
    background: ${ColorPrimary};
    opacity: 0.3;
    position: fixed;
    top: 0;
    z-index: ${MaxZIndex};
`;

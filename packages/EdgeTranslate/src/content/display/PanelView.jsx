/** @jsx h */
import { h, Fragment } from "preact";
import { StyleSheetManager } from "styled-components";
import root from "react-shadow/styled-components";
import SimpleBar from "simplebar-react";
import Dropdown from "./Dropdown.jsx";
import Result from "./Result.jsx";
import Loading from "./Loading.jsx";
import Error from "./Error.jsx";
import SettingIcon from "./icons/setting.svg";
import CloseIcon from "./icons/close.svg";
import {
    MaxZIndex,
    GlobalStyle,
    Panel,
    Head,
    HeadIcons,
    HeadIcon,
    StyledPinIcon,
    Body,
    SourceOption,
    Highlight,
} from "./Panel.styles.js";

export default function PanelView(props) {
    if (!props.open) return null;

    return (
        <root.div ref={props.containerElRef} style={props.containerStyle}>
            <StyleSheetManager disableCSSOMInjection>
                <Fragment>
                    <GlobalStyle />
                    <Panel ref={props.onDisplayStatusChange} displayType={props.displayType}>
                        {props.moveableReady && <PanelContent {...props} />}
                    </Panel>
                    {props.highlight.show && (
                        <Highlight
                            style={{
                                width: props.highlightWidth,
                                [props.highlight.position]: 0,
                            }}
                        />
                    )}
                </Fragment>
            </StyleSheetManager>
        </root.div>
    );
}

function PanelContent(props) {
    return (
        <Fragment>
            <PanelHead {...props} />
            <Body>
                <SimpleBar ref={props.simplebarRef}>
                    {props.contentType === "LOADING" && <Loading {...props.content} />}
                    {props.contentType === "RESULT" && <Result {...props.content} />}
                    {props.contentType === "ERROR" && <Error {...props.content} />}
                </SimpleBar>
            </Body>
        </Fragment>
    );
}

function PanelHead(props) {
    return (
        <Head ref={props.headElRef} data-testid="Head">
            <SourceOption
                role="button"
                title={chrome.i18n.getMessage(`${props.currentTranslator}Short`)}
                activeKey={props.currentTranslator}
                onSelect={props.onTranslatorSelect}
                data-testid="SourceOption"
            >
                {props.availableTranslators?.map((translator) => (
                    <DropdownItem key={translator} translator={translator} />
                ))}
            </SourceOption>
            <HeadIcons>
                <HeadAction
                    title={chrome.i18n.getMessage("Settings")}
                    onClick={props.onOpenOptions}
                    testId="SettingIcon"
                >
                    <SettingIcon />
                </HeadAction>
                <HeadAction
                    title={chrome.i18n.getMessage(
                        props.panelFix ? "UnfixResultFrame" : "FixResultFrame"
                    )}
                    onClick={props.onTogglePin}
                    testId="PinIcon"
                >
                    <StyledPinIcon fix={props.panelFix} />
                </HeadAction>
                <HeadAction
                    title={chrome.i18n.getMessage("CloseResultFrame")}
                    onClick={props.onClose}
                    testId="CloseIcon"
                >
                    <CloseIcon />
                </HeadAction>
            </HeadIcons>
        </Head>
    );
}

function HeadAction({ children, title, onClick, testId }) {
    return (
        <HeadIcon role="button" title={title} onClick={onClick} data-testid={testId}>
            {children}
        </HeadIcon>
    );
}

function DropdownItem({ translator }) {
    return (
        <Dropdown.Item role="button" eventKey={translator}>
            {chrome.i18n.getMessage(translator)}
        </Dropdown.Item>
    );
}

export function getContainerStyle(usePDFMaskLayer) {
    if (!usePDFMaskLayer) return {};
    return {
        width: document.body.children[0].clientWidth,
        height: document.body.children[0].clientHeight,
        position: "fixed",
        zIndex: MaxZIndex,
    };
}

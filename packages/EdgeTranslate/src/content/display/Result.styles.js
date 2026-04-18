import styled from "styled-components";
import DrawerBlock from "./DrawerBlock.jsx";
import EditIcon from "./icons/edit.svg";
import EditDoneIcon from "./icons/edit-done.svg";
import PronounceIcon from "./icons/pronounce.svg";
import PronounceLoadingIcon from "./icons/loading.jsx";
import CopyIcon from "./icons/copy.svg";

const BlockPadding = "10px";
const BlockMargin = "8px";
const LightPrimary = "rgba(74, 140, 247, 0.7)";
const Gray = "#919191";
const BlockContentDrawerHeight = 150;
const TextContentDrawerHeight = 50;

const Block = styled.div`
    width: calc(100% - 2 * ${BlockMargin});
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding: ${BlockPadding};
    margin: ${BlockMargin};
    margin-top: 0;
    background-color: rgb(250, 250, 250);
    border-radius: 10px;
    line-height: 120%;
    letter-spacing: 0.02em;
`;

const Source = styled(Block)`
    font-weight: normal;
    white-space: pre-wrap;
`;

const Target = styled(Block)`
    font-weight: normal;
    white-space: pre-wrap;
`;

const Detail = styled(Block)`
    font-weight: normal;
`;

const TextLine = styled.div`
    width: 100%;
    display: flex;
    margin: 5px 0;
    flex-direction: ${(props) => (props.theme.textDirection === "ltr" ? "row" : "row-reverse")};
    justify-content: space-between;
    align-items: center;
`;

const StyledEditIcon = styled(EditIcon)`
    width: 18px;
    height: 18px;
    fill: ${Gray};
    flex-shrink: 0;
    margin-left: 2px;
    transition: fill 0.2s linear;
    &:hover {
        fill: dimgray;
    }
`;

const StyledEditDoneIcon = styled(EditDoneIcon)`
    width: 18px;
    height: 18px;
    fill: ${Gray};
    flex-shrink: 0;
    margin-left: 2px;
    transition: fill 0.2s linear;
    &:hover {
        fill: dimgray;
    }
`;

const PronounceLine = styled.div`
    width: 100%;
    margin: 5px 0;
    display: flex;
    flex-direction: ${(props) => (props.theme.textDirection === "ltr" ? "row" : "row-reverse")};
    justify-content: flex-start;
    align-items: center;
`;

const PronounceText = styled(DrawerBlock)`
    color: ${Gray};
`;

const StyledCopyIcon = styled(CopyIcon)`
    width: 20px;
    height: 20px;
    fill: ${Gray};
    flex-shrink: 0;
    margin-left: 2px;
    transition: fill 0.2s linear;
    &:hover {
        fill: dimgray;
    }
`;

const StyledPronounceIcon = styled(PronounceIcon)`
    width: 20px;
    height: 20px;
    padding: 2px;
    margin-right: 10px;
    fill: ${LightPrimary};
    flex-shrink: 0;
    transition: fill 0.2s linear;
    ${(props) =>
        props.theme.textDirection === "ltr"
            ? `
                margin-right: 10px;
            `
            : `
                margin-left: 10px;
                transform: rotate(180deg);
            `}

    &:hover {
        fill: orange !important;
    }
`;

const StyledPronounceLoadingIcon = styled(PronounceLoadingIcon)`
    width: 24px;
    height: 24px;
    margin-right: 10px;
    fill: ${LightPrimary};
    padding: 0;
    flex-shrink: 0;

    circle {
        fill: none;
        stroke: ${LightPrimary} !important;
    }
`;

const BlockHead = styled.div`
    width: 100%;
    display: flex;
    flex-direction: ${(props) => (props.theme.textDirection === "ltr" ? "row" : "row-reverse")};
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
`;

const BlockHeadTitle = styled.span`
    font-size: small;
    ${(props) =>
        `${props.theme.textDirection === "ltr" ? "margin-left" : "margin-right"}:${BlockPadding}`}
`;

const BlockHeadSpot = styled.span`
    width: 10px;
    height: 10px;
    border-radius: 50%;
`;

const BlockSplitLine = styled.div`
    width: 100%;
    height: 1px;
    margin: 5px 0;
    flex-shrink: 0;
    border: none;
    background: rgba(0, 0, 0, 0.25);
`;

const BlockContent = styled(DrawerBlock)`
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: ${(props) => (props.theme.textDirection === "ltr" ? "flex-start" : "flex-end")};
    flex-shrink: 0;
`;

const DetailHeadSpot = styled(BlockHeadSpot)`
    background-color: #00bfa5;
`;

const Position = styled.div`
    color: ${Gray};
    font-size: smaller;
`;

const DetailMeaning = styled.div`
    padding: 5px 0;
    ${(props) => (props.theme.textDirection === "ltr" ? "margin-left" : "margin-right")}: 10px;
`;

const SynonymTitle = styled.div`
    color: ${Gray};
    font-size: small;
    ${(props) => (props.theme.textDirection === "ltr" ? "margin-left" : "margin-right")}: 10px;
`;

const SynonymLine = styled.div`
    display: flex;
    flex-wrap: wrap;
    padding: 5px 0;
    ${(props) =>
        props.theme.textDirection === "ltr"
            ? `
                margin-left: 10px;
                flex-direction: row;
            `
            : `
                margin-right: 10px;       
                flex-direction: row-reverse;
            `};
`;

const SynonymWord = styled.span`
    padding: 2px 10px;
    margin: 0 2px 3px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 32px;
    cursor: pointer;
    font-size: small;
`;

const Definition = styled(Block)``;

const DefinitionHeadSpot = styled(BlockHeadSpot)`
    background-color: #ff4081;
`;

const DefinitionExample = styled(DetailMeaning)`
    color: #5f6368;
`;

const Example = styled(Block)``;

const ExampleHeadSpot = styled(BlockHeadSpot)`
    background-color: #3d5afe;
`;

const ExampleList = styled.ol`
    list-style-type: decimal;
    ${(props) => (props.theme.textDirection === "ltr" ? "padding-left" : "padding-right")}: 1.5rem;
    margin: 0;
`;

const ExampleItem = styled.li`
    padding: 5px 0;
    font-size: small;
`;

const ExampleSource = styled.div`
    font-size: medium;
`;

const ExampleTarget = styled.div`
    padding-top: 5px;
    font-size: medium;
`;

const ScreenshotNotice = styled(Block)`
    align-items: flex-start;
    padding: 2px 10px 10px;
    background: transparent;
`;

const ScreenshotNoticeText = styled.div`
    font-size: 12px;
    line-height: 1.5;
    color: #7a7a7a;
`;

const ScreenshotNoticeAction = styled.button`
    padding: 0;
    border: none;
    background: transparent;
    vertical-align: baseline;
    color: #7a7a7a;
    font-size: 12px;
    cursor: pointer;
    text-decoration: underline;
`;

export {
    BlockContent,
    BlockContentDrawerHeight,
    BlockHead,
    BlockHeadTitle,
    BlockSplitLine,
    Definition,
    DefinitionExample,
    DefinitionHeadSpot,
    Detail,
    DetailHeadSpot,
    DetailMeaning,
    Example,
    ExampleHeadSpot,
    ExampleItem,
    ExampleList,
    ExampleSource,
    ExampleTarget,
    Position,
    PronounceLine,
    PronounceText,
    ScreenshotNotice,
    ScreenshotNoticeAction,
    ScreenshotNoticeText,
    Source,
    StyledCopyIcon,
    StyledEditDoneIcon,
    StyledEditIcon,
    StyledPronounceIcon,
    StyledPronounceLoadingIcon,
    SynonymLine,
    SynonymTitle,
    SynonymWord,
    Target,
    TextContentDrawerHeight,
    TextLine,
};

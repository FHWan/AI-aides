import { StagehandContainer } from "./StagehandContainer";
export declare function isElementNode(node: Node): node is Element;
export declare function isTextNode(node: Node): node is Text;
/**
 * Finds and returns a list of scrollable elements on the page,
 * ordered from the element with the largest scrollHeight to the smallest.
 *
 * @param topN Optional maximum number of scrollable elements to return.
 *             If not provided, all found scrollable elements are returned.
 * @returns An array of HTMLElements sorted by descending scrollHeight.
 */
export declare function getScrollableElements(topN?: number): HTMLElement[];
/**
 * Calls getScrollableElements, then for each element calls generateXPaths,
 * and returns the first XPath for each.
 *
 * @param topN (optional) integer limit on how many scrollable elements to process
 * @returns string[] list of XPaths (1 for each scrollable element)
 */
export declare function getScrollableElementXpaths(topN?: number): Promise<string[]>;
export declare function processDom(chunksSeen: Array<number>): Promise<{
    outputString: string;
    selectorMap: Record<number, string[]>;
    chunk: number;
    chunks: number[];
}>;
export declare function processAllOfDom(): Promise<{
    outputString: string;
    selectorMap: {};
}>;
export declare function processElements(chunk: number, scrollToChunk?: boolean, indexOffset?: number, container?: StagehandContainer): Promise<{
    outputString: string;
    selectorMap: Record<number, string[]>;
}>;
export declare function storeDOM(): string;
export declare function restoreDOM(storedDOM: string): void;
export declare function createTextBoundingBoxes(): void;
export declare function getElementBoundingBoxes(xpath: string): Array<{
    text: string;
    top: number;
    left: number;
    width: number;
    height: number;
}>;

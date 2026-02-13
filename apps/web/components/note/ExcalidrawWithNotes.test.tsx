import React from "react";
import { render, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/dynamic", () => {
  return {
    default: () => () => null,
  };
});

vi.mock("@/context/ThemeContext", () => {
  return {
    useTheme: () => ({ theme: "light" }),
  };
});

vi.mock("./NoteEditor", () => {
  return {
    NoteEditor: () => null,
    default: () => null,
  };
});

import { ExcalidrawWithNotes } from "./ExcalidrawWithNotes";

describe("ExcalidrawWithNotes", () => {
  it("does not enter an onChange loop when wrapper state updates", async () => {
    let renderCount = 0;
    let onChangeCount = 0;

    const FakeExcalidraw = React.memo((props: any) => {
      renderCount += 1;

      const offsetRef = React.useRef(0);
      const api = React.useMemo(() => {
        return {
          getAppState: () => {
            offsetRef.current += 1;
            return {
              scrollX: 0,
              scrollY: 0,
              zoom: { value: 1 },
              width: 800,
              height: 600,
              offsetLeft: offsetRef.current,
              offsetTop: offsetRef.current,
              selectedElementIds: {},
            };
          },
          getSceneElements: () => props.initialData?.elements ?? [],
          getFiles: () => ({}),
          updateScene: () => {},
        };
      }, [props.initialData]);

      React.useEffect(() => {
        props.excalidrawAPI?.(api);
      }, [props.excalidrawAPI, api]);

      React.useEffect(() => {
        onChangeCount += 1;
        if (onChangeCount > 20) {
          throw new Error("onChange loop detected");
        }
        props.onChange?.(props.initialData?.elements ?? []);
      });

      return null;
    });

    const initialData = {
      elements: [
        {
          id: "el1",
          type: "rectangle",
          version: 1,
          isDeleted: false,
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          angle: 0,
        },
      ],
      appState: {},
      files: {},
    };

    render(
      <ExcalidrawWithNotes
        initialData={initialData}
        onChange={vi.fn()}
        ExcalidrawComponent={FakeExcalidraw}
      />,
    );

    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    // React can re-render in development/test environments; the regression target
    // is preventing an unbounded loop of wrapper updates.
    expect(renderCount).toBeLessThanOrEqual(3);
    expect(onChangeCount).toBeLessThanOrEqual(3);
  });
});

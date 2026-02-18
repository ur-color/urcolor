import { describe, expect, it } from "bun:test";
import { ref, nextTick, defineComponent, h } from "vue";
import "internationalized-color/css";
import { Color } from "internationalized-color";
import { mount } from "@vue/test-utils";
import {
  useColor,
  useRGB,
  useHSL,
  useHSV,
  useHWB,
  useOKLCh,
  useOKLab,
  useLCh,
  useLab,
  useP3,
  useA98,
  useProPhoto,
  useRec2020,
} from "../src/composables";

export function withSetup<T>(composable: () => T): [T, ReturnType<typeof mount>] {
  let result!: T;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = composable();
        return () => h("div");
      },
    }),
  );
  return [result, wrapper];
}

describe("useColor", () => {
  it("parses a hex string", () => {
    const [result] = withSetup(() => useColor("#ff0000"));
    expect(result.hex.value).toBe("#ff0000");
    expect(result.alpha.value).toBe(100);
  });

  it("parses a Color instance", () => {
    const color = Color.parse("hsl(120, 100%, 50%)")!;
    const [result] = withSetup(() => useColor(color));
    expect(result.color.value).toBeInstanceOf(Color);
  });

  it("falls back to black for null/undefined", () => {
    const [result] = withSetup(() => useColor(null));
    expect(result.hex.value).toBe("#000000");
  });

  it("falls back to black for invalid string", () => {
    const [result] = withSetup(() => useColor("not-a-color"));
    expect(result.hex.value).toBe("#000000");
  });

  it("reacts to ref changes", async () => {
    const input = ref("#ff0000");
    const [result] = withSetup(() => useColor(input));
    expect(result.hex.value).toBe("#ff0000");

    input.value = "#00ff00";
    await nextTick();
    expect(result.hex.value).toBe("#00ff00");
  });

  it("sets hex", () => {
    const [result] = withSetup(() => useColor("#ff0000"));
    result.hex.value = "#0000ff";
    expect(result.hex.value).toBe("#0000ff");
  });

  it("ignores invalid hex set", () => {
    const [result] = withSetup(() => useColor("#ff0000"));
    result.hex.value = "garbage";
    expect(result.hex.value).toBe("#ff0000");
  });

  it("sets alpha", () => {
    const [result] = withSetup(() => useColor("#ff0000"));
    result.alpha.value = 50;
    expect(result.alpha.value).toBe(50);
  });
});

describe("useRGB", () => {
  it("returns r, g, b channels", () => {
    const [result] = withSetup(() => useRGB("#ff0000"));
    expect(result.r.value).toBe(255);
    expect(result.g.value).toBe(0);
    expect(result.b.value).toBe(0);
  });

  it("sets r channel", () => {
    const [result] = withSetup(() => useRGB("#ff0000"));
    result.r.value = 0;
    expect(result.r.value).toBe(0);
  });
});

describe("useHSL", () => {
  it("returns h, s, l channels", () => {
    const [result] = withSetup(() => useHSL("#ff0000"));
    expect(result.h.value).toBe(0);
    expect(result.s.value).toBe(100);
    expect(result.l.value).toBe(50);
  });

  it("sets h channel", () => {
    const [result] = withSetup(() => useHSL("#ff0000"));
    result.h.value = 120;
    expect(result.h.value).toBe(120);
  });
});

describe("useHSV", () => {
  it("returns h, s, v channels", () => {
    const [result] = withSetup(() => useHSV("#ff0000"));
    expect(result.h.value).toBe(0);
    expect(result.s.value).toBe(100);
    expect(result.v.value).toBe(100);
  });
});

describe("useHWB", () => {
  it("returns h, w, b channels", () => {
    const [result] = withSetup(() => useHWB("#ff0000"));
    expect(result.h.value).toBe(0);
    expect(result.w.value).toBe(0);
    expect(result.b.value).toBe(0);
  });
});

describe("useOKLCh", () => {
  it("returns l, c, h channels", () => {
    const [result] = withSetup(() => useOKLCh("#ff0000"));
    expect(typeof result.l.value).toBe("number");
    expect(typeof result.c.value).toBe("number");
    expect(typeof result.h.value).toBe("number");
  });
});

describe("useOKLab", () => {
  it("returns l, a, b channels", () => {
    const [result] = withSetup(() => useOKLab("#ff0000"));
    expect(typeof result.l.value).toBe("number");
    expect(typeof result.a.value).toBe("number");
    expect(typeof result.b.value).toBe("number");
  });
});

describe("useLCh", () => {
  it("returns l, c, h channels", () => {
    const [result] = withSetup(() => useLCh("#ff0000"));
    expect(typeof result.l.value).toBe("number");
    expect(typeof result.c.value).toBe("number");
    expect(typeof result.h.value).toBe("number");
  });
});

describe("useLab", () => {
  it("returns l, a, b channels", () => {
    const [result] = withSetup(() => useLab("#ff0000"));
    expect(typeof result.l.value).toBe("number");
    expect(typeof result.a.value).toBe("number");
    expect(typeof result.b.value).toBe("number");
  });
});

describe("useP3", () => {
  it("returns r, g, b channels", () => {
    const [result] = withSetup(() => useP3("#ff0000"));
    expect(typeof result.r.value).toBe("number");
    expect(typeof result.g.value).toBe("number");
    expect(typeof result.b.value).toBe("number");
  });
});

describe("useA98", () => {
  it("returns r, g, b channels", () => {
    const [result] = withSetup(() => useA98("#ff0000"));
    expect(typeof result.r.value).toBe("number");
    expect(typeof result.g.value).toBe("number");
    expect(typeof result.b.value).toBe("number");
  });
});

describe("useProPhoto", () => {
  it("returns r, g, b channels", () => {
    const [result] = withSetup(() => useProPhoto("#ff0000"));
    expect(typeof result.r.value).toBe("number");
    expect(typeof result.g.value).toBe("number");
    expect(typeof result.b.value).toBe("number");
  });
});

describe("useRec2020", () => {
  it("returns r, g, b channels", () => {
    const [result] = withSetup(() => useRec2020("#ff0000"));
    expect(typeof result.r.value).toBe("number");
    expect(typeof result.g.value).toBe("number");
    expect(typeof result.b.value).toBe("number");
  });
});

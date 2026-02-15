import { Glob, plugin } from "bun";
import { compileScript, compileTemplate, parse, rewriteDefault } from "@vue/compiler-sfc";

const cache = new Map<string, string>();

// Pre-compile all Vue files
const glob = new Glob("packages/vue/src/components/ColorArea/*.vue");
for await (const file of glob.scan(".")) {
  const fullPath = `${process.cwd()}/${file}`;
  const source = await Bun.file(fullPath).text();
  try {
    const output = compileVueSFC(source, fullPath);
    cache.set(fullPath, output);
  } catch (e: unknown) {
    console.error("Pre-compile failed:", file, (e as Error).message?.substring(0, 200));
  }
}

function compileVueSFC(source: string, filename: string): string {
  const { descriptor } = parse(source, { filename });

  const id = filename.replace(/[^a-zA-Z0-9]/g, "_");
  const scopeId = `data-v-${id.slice(-8)}`;
  const isTS = descriptor.scriptSetup?.lang === "ts" || descriptor.script?.lang === "ts";

  let scriptCode: string;
  let bindings: ReturnType<typeof compileScript>["bindings"];

  if (descriptor.script || descriptor.scriptSetup) {
    const compiled = compileScript(descriptor, {
      id: scopeId,
      inlineTemplate: descriptor.scriptSetup ? true : false,
      templateOptions: descriptor.scriptSetup
        ? {
            compilerOptions: {
              expressionPlugins: isTS ? ["typescript"] : [],
            },
          }
        : undefined,
    });
    if (descriptor.scriptSetup) {
      // inlineTemplate: true already includes the render function
      scriptCode = rewriteDefault(
        compiled.content,
        "_sfc_main",
        isTS ? ["typescript"] : [],
      );
      return [
        scriptCode,
        `_sfc_main.__file = ${JSON.stringify(filename)}`,
        "export default _sfc_main",
      ].join("\n");
    }
    scriptCode = rewriteDefault(
      compiled.content,
      "_sfc_main",
      isTS ? ["typescript"] : [],
    );
    bindings = compiled.bindings;
  } else {
    scriptCode = "const _sfc_main = {}";
  }

  let templateCode = "";
  if (descriptor.template) {
    const templateResult = compileTemplate({
      source: descriptor.template.content,
      filename,
      id: scopeId,
      compilerOptions: {
        bindingMetadata: bindings,
        expressionPlugins: isTS ? ["typescript"] : [],
      },
    });
    templateCode = templateResult.code;
  }

  return [
    scriptCode,
    templateCode,
    "_sfc_main.render = render",
    `_sfc_main.__file = ${JSON.stringify(filename)}`,
    "export default _sfc_main",
  ].join("\n");
}

plugin({
  name: "vue-sfc-and-patches",
  setup(build) {
    // Handle .vue files
    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      if (cache.has(args.path)) {
        return { contents: cache.get(args.path)!, loader: "tsx" };
      }
      const source = await Bun.file(args.path).text();
      const output = compileVueSFC(source, args.path);
      return { contents: output, loader: "tsx" };
    });

    // Patch reka-ui's Primitive to spread attrs (fixes Proxy set trap issue in bun/happy-dom)
    build.onLoad({ filter: /reka-ui\/dist\/Primitive\/Primitive\.js$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      // Replace `h(asTag, attrs)` and `h(props.as, attrs, ...)` with spread versions
      const patched = source
        .replace(/h\(asTag, attrs\)/g, "h(asTag, { ...attrs })")
        .replace(/h\(props\.as, attrs,/g, "h(props.as, { ...attrs },");
      return { contents: patched, loader: "js" };
    });

    // Also patch Slot.js
    build.onLoad({ filter: /reka-ui\/dist\/Primitive\/Slot\.js$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      // Spread attrs in Slot too
      const patched = source.replace(
        /mergeProps\(childProps, attrs\)/g,
        "mergeProps(childProps, { ...attrs })",
      );
      return { contents: patched, loader: "js" };
    });
  },
});

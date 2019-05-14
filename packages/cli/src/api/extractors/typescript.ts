import fs from "fs"
import { transform } from "../compat"

import linguiExtractMessages from "@lingui/babel-plugin-extract-messages"
import * as ts from "typescript"

import { projectType } from "../detect"
import { ExtractorType } from "./types"

interface BabelOptions {
  plugins?: Array<string>
  presets?: Array<string>
}

interface ExtractOptions {
  projectType?: string
  babelOptions?: BabelOptions
}

const typescriptRe = /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/i

const extractor: ExtractorType = {
  match(filename) {
    return typescriptRe.test(filename)
  },

  extract(filename, localeDir, options: ExtractOptions = {}) {
    const content = fs.readFileSync(filename, "utf8")
    const isTsx = filename.endsWith(".tsx")
    // pass jsx to babel untouched
    const jsx = isTsx ? ts.JsxEmit.Preserve : ts.JsxEmit.None
    const stripped = ts.transpileModule(content, {
      compilerOptions: {
        filename,
        jsx,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2016, // use ES2015 or ES2016 to preserve tagged template literal
        allowSyntheticDefaultImports: true,
        moduleResolution: ts.ModuleResolutionKind.NodeJs
      }
    })

    const frameworkOptions: BabelOptions = {}

    if (options.projectType === projectType.CRA) {
      frameworkOptions.presets = ["react-app"]
    }

    const { babelOptions = {} } = options
    const plugins = [
      "macros",
      [linguiExtractMessages, { localeDir }],
      ...(babelOptions.plugins || [])
    ]

    if (isTsx) {
      plugins.unshift("@babel/plugin-syntax-jsx")
    }

    transform(stripped.outputText, {
      ...babelOptions,
      ...frameworkOptions,
      filename,
      plugins
    })
  }
}

export default extractor
import { createFilter } from "rollup-pluginutils";
import recast from "recast";

const b = recast.types.builders;

export default function invariantPlugin(options = {}) {
  const filter = createFilter(options.include, options.exclude);

  return {
    transform(code, id) {
      if (!filter(id)) {
        return;
      }

      const ast = recast.parse(code, { parser: this });

      recast.visit(ast, {
        visitCallExpression(path) {
          this.traverse(path);
          const node = path.value;
          if (isCallWithLength(node, "invariant", 1)) {
            return b.conditionalExpression(
              makeNodeEnvTest(),
              b.callExpression.from({
                ...node,
                arguments: node.arguments.slice(0, 1),
              }),
              node,
            );
          }
        },

        visitNewExpression(path) {
          this.traverse(path);
          const node = path.value;
          if (isCallWithLength(node, "InvariantError", 0)) {
            return b.conditionalExpression(
              makeNodeEnvTest(),
              b.newExpression.from({
                ...node,
                arguments: [],
              }),
              node,
            );
          }
        }
      });

      return {
        code: recast.print(ast).code,
        map: null,
      };
    }
  };
}

function isCallWithLength(node, name, length) {
  return (
    node.callee.type === "Identifier" &&
    node.callee.name === name &&
    node.arguments.length > length
  );
}

function makeNodeEnvTest() {
  return b.binaryExpression(
    "===",
    b.memberExpression(
      b.memberExpression(
        b.identifier("process"),
        b.identifier("env")
      ),
      b.identifier("NODE_ENV"),
    ),
    b.stringLiteral("production"),
  );
}

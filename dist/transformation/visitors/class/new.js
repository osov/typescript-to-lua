"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformNewExpression = void 0;
const lua = require("../../../LuaAST");
const annotations_1 = require("../../utils/annotations");
const diagnostics_1 = require("../../utils/diagnostics");
const lualib_1 = require("../../utils/lualib");
const call_1 = require("../call");
const table_1 = require("../language-extensions/table");
const transformNewExpression = (node, context) => {
    var _a, _b;
    if ((0, table_1.isTableNewCall)(context, node)) {
        return lua.createTableExpression(undefined, node);
    }
    const signature = context.checker.getResolvedSignature(node);
    const [name, params] = (0, call_1.transformCallAndArguments)(context, node.expression, (_a = node.arguments) !== null && _a !== void 0 ? _a : [], signature);
    const type = context.checker.getTypeAtLocation(node);
    const annotations = (0, annotations_1.getTypeAnnotations)(type);
    const customConstructorAnnotation = annotations.get(annotations_1.AnnotationKind.CustomConstructor);
    if (customConstructorAnnotation) {
        if (customConstructorAnnotation.args.length === 1) {
            return lua.createCallExpression(lua.createIdentifier(customConstructorAnnotation.args[0]), (0, call_1.transformArguments)(context, (_b = node.arguments) !== null && _b !== void 0 ? _b : []), node);
        }
        else {
            context.diagnostics.push((0, diagnostics_1.annotationInvalidArgumentCount)(node, annotations_1.AnnotationKind.CustomConstructor, customConstructorAnnotation.args.length, 1));
        }
    }
    return (0, lualib_1.transformLuaLibFunction)(context, lualib_1.LuaLibFeature.New, node, name, ...params);
};
exports.transformNewExpression = transformNewExpression;
//# sourceMappingURL=new.js.map
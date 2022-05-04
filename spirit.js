const ops = require("./operations.js");
const types = require("./types");

const Main = types.Global();

const isIterable = (input) => {
    if (input === null || input === undefined) {
        return false
    }
    return typeof input[Symbol.iterator] === 'function'
}

const transformations = (target, series, targetMap, reducers) => {
    const opCodes = series.split("->");
    let currentArgument = undefined;
    let pos = 0;
    for (let opCode of opCodes) {
        const explicit = isExplicitOpCode(opCode)
        const firstArg = explicit ? "" : getFirstArg(opCode);
        if (pos === opCodes.length - 1) {
            return interpretImplicit(opCode,currentArgument,target,targetMap,reducers);
        }
        if (isIterable(currentArgument)) {
            if (explicit) {
                currentArgument = currentArgument.map(value => {return interpretExplicit(opCode.slice(1,opCode.length - 1),value,target,targetMap,reducers)});
            }else {
                if (Object.keys(reducers).includes(firstArg)) {
                    currentArgument = interpretImplicit(opCode,currentArgument,target,targetMap,reducers);
                } else {
                    currentArgument = currentArgument.map(value => interpretImplicit(opCode,value,target,targetMap,reducers));
                }
            }
        }else{
            if (explicit) {
                currentArgument = interpretExplicit(opCode.slice(1,opCode.length - 1),currentArgument,target,targetMap,reducers);
            }else {
                currentArgument = interpretImplicit(opCode,currentArgument,target,targetMap,reducers);
            }
        }
        pos++;
    }
    return currentArgument
}

const getFirstArg = (syntax) => {
    const commaIdx = syntax.indexOf(",");
    return syntax.slice(0,commaIdx !== -1 ? commaIdx : syntax.length);
}

const interpretExplicit = (syntax, value, target, operations, reducers) => {
    let expr = syntax.replace("@",JSON.stringify(value));
    let [exprStart,exprEnd] = [-1,-1];
    while (expr.includes('`')) {
        const ticks = expr.split('`').length;
        [exprStart,exprEnd] = coordsOfChar(expr,['`'],['(',')']);
        const implicit = expr.slice(exprStart + 1, exprEnd);
        const result = interpretImplicit(implicit,value,target,operations,reducers);
        expr = expr.slice(0,exprStart) + result + expr.slice(exprEnd + 1);
        if (ticks - 2 !== expr.split('`').length) {
            throw 'Backtick count mismatch!'
        }
    }
    return eval(expr);
}

const coordsOfChar = (input, symbols,alts) => {
    let [start,end] = [-1,-1];
    let nestDepth = [0,0];
    for (let i = 0 ; i < input.length ; i ++ ) {
        const char = input[i];
        if (symbols.includes(char)) {
            if (start === -1) {
                start = i;
            }
            nestDepth[0]++;
        }else if (alts.includes(char)) {
            nestDepth[1]++;
        }
        if (nestDepth[0] + nestDepth[1] > 0 && nestDepth[0] % 2 === 0 && nestDepth[1] % 2 === 0) {
            end = i;
            break;
        }
    }
    return [start,end];
}

const interpretImplicit = (syntax, value, target,operations,reducers) => {
    let tokens = syntax.split(",");
    const opCode = tokens[0];
    tokens = tokens.slice(1);
    tokens = tokens.map(token => {return token === "@" ? value : token});
    tokens = tokens.map(token => {return typeof token === "string" && token.includes("/") ? token.split("/") : token});
    tokens = tokens.map(token => {
        let [exprStart,exprEnd] = [-1,-1];
        while (typeof token === "string" && token.split(/[()]+/).length > 1) {
            const parens = token.split(/[()]+/).length;
            [exprStart,exprEnd] = coordsOfChar(token,['(',')'],['`']);
            const explicit = token.slice(exprStart + 1, exprEnd);
            const result = interpretExplicit(explicit,value,target,operations,reducers);
            token = token.slice(0,exprStart) + result + token.slice(exprEnd + 1);
            if (parens - 2 !== token.split(/[()]+/).length) {
                throw 'Parentheses count mismatch!'
            }
        }
        return token;
    })
    const isReducing = Object.keys(reducers).includes(opCode)
    const operation = isReducing ? reducers[opCode] : operations[opCode];
    const effectiveValue = isReducing ? value : target;
    const requiredArgs = operation.length;
    const providedArgs = 1 + tokens.length;
    if (requiredArgs === providedArgs + 1) {
        return operation(target,value,...tokens);
    }else {
        return operation(effectiveValue,...tokens);
    }

}

const isExplicitOpCode = (string) => {
    return string[0] === "(" && string[string.length - 1] === ")";
}


const adj1 = types.Land("S",[],1);
const adj2 = types.Land("M",[],1);
const adj3 = types.Land("W",[])
const land = types.Land("J", [adj1,adj2,adj3], 0,2,0,3);

console.log(transformations(land,"adj->ftr,S/M->bli->sum->rep,T,S,@,@",ops.landMappings,ops.higherOrder));
console.log(transformations(land,"set->ftr,J/S->sum->(@ == 0 ? 1 : 4)->def",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"dah->dmg,A",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"dme,1,C/T",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"dah->(2*@)->dmg,A",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"(2*`dah`+`dah`)->dmg,A",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"dmg,(true ? `bli`+1 : 1),A",ops.landMappings,ops.higherOrder))



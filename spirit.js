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
        const advanced = isAdvancedOpCode(opCode)
        const firstArg = advanced ? "" : getFirstArg(opCode);
        if (pos === opCodes.length - 1) {
            return interpretImplicit(opCode,currentArgument,target,targetMap,reducers);
        }
        if (isIterable(currentArgument)) {
            if (advanced) {
                currentArgument = currentArgument.map(value => {return interpretExplicit(opCode,value,target,targetMap,reducers)});
            }else {
                if (Object.keys(reducers).includes(firstArg)) {
                    currentArgument = interpretImplicit(opCode,currentArgument,target,targetMap,reducers);
                } else {
                    currentArgument = currentArgument.map(value => interpretImplicit(opCode,value,target,targetMap,reducers));
                }
            }
        }else{
            if (advanced) {
                currentArgument = interpretExplicit(opCode,currentArgument,target,targetMap,reducers);
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
    let expr = syntax.slice(1,syntax.length - 1);
    expr = expr.replace("@",JSON.stringify(value));
    if (expr.includes('`')) {
        const coords = coordsOfChar(expr,'`');
        const start = coords[0];
        const end = coords[1];
        const implicit = expr.slice(start + 1, end);
        const result = interpretImplicit(implicit,value,target,operations,reducers);
        expr = expr.slice(0,start) + result + expr.slice(end + 1);
    }
    return eval(expr);
}

const coordsOfChar = (input, symbol) => {
    const startIdx = input.indexOf(symbol);
    const endIdx = input.indexOf(symbol,startIdx+1);
    return [startIdx,endIdx];
}

//check if is reducer, for plural do via map (if not reducer)
const interpretImplicit = (syntax, value, target,operations,reducers) => {
    let tokens = syntax.split(",");
    const opCode = tokens[0];
    tokens = tokens.slice(1);
    tokens = tokens.map(token => {return token === "@" ? value : token});
    tokens = tokens.map(token => {return typeof token === "string" && token.includes("/") ? token.split("/") : token});
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

const isAdvancedOpCode = (string) => {
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
console.log(transformations(land,"(2*`dah`)->dmg,A",ops.landMappings,ops.higherOrder))


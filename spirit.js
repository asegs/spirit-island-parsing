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
    for (let pos = 0 ; pos < opCodes.length;) {
        let opCode = opCodes[pos];
        const explicit = isExplicitOpCode(opCode)
        let firstArg = explicit ? "" : getFirstArg(opCode);
        const escape = firstArg.length > 0 && firstArg[0] === '~';
        if (escape) {
            firstArg = firstArg.slice(1);
            opCode = opCode.slice(1);
        }
        if (pos === opCodes.length - 1 && firstArg !== "cjp") {
            return interpretImplicit(opCode,currentArgument,target,targetMap,reducers);
        }
        if (isIterable(currentArgument)) {
            if (explicit) {
                currentArgument = currentArgument.map(value => {return interpretExplicit(opCode.slice(1,opCode.length - 1),value,target,targetMap,reducers)});
            }else {
                if (Object.keys(reducers).includes(firstArg) || escape) {
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

        if (hasJump(currentArgument) || (Array.isArray(currentArgument) && currentArgument.filter(arg => hasJump(arg)).length > 0)) {
            if (Array.isArray(currentArgument)) {
                const jumps = getJumpsFromArr(currentArgument);
                pos = jumps.jumpTo;
                currentArgument = jumps.values;
            }else {
                pos = currentArgument.jumpTo;
                currentArgument = currentArgument.value;
            }
        } else {
            pos ++;
        }
    }
    return currentArgument
}

const hasJump = (val) => {return Object.keys(val).includes("jumpTo")}

const getJumpsFromArr = (arr) => {
    const values = arr.map(element => hasJump(element) ? element.value : element);
    const jumps = arr.filter(element => hasJump(element));
    return {values:values,jumpTo: jumps.length > 0 ? jumps[0].jumpTo : 0};
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
    tokens = tokens.map(token => {
        if (token === "@") {token = value;}
        if (typeof token === "string" && token.includes("/")) {token = token.split("/");}
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
    if (!operation) {
        throw "Operation named " + opCode + " not found!"
    }
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
const adj4 = types.Land("O",[])
const land = types.Land("J", [adj1,adj2,adj3,adj4], 3,4,1,3);

// console.log(transformations(land,"adj->ftr,S/M->bli->sum->rep,T,S,@,@",ops.landMappings,ops.higherOrder));
// console.log(transformations(land,"set->ftr,J/S->sum->(@ == 0 ? 1 : 4)->def",ops.landMappings,ops.higherOrder))
// console.log(transformations(land,"dah->dmg,A",ops.landMappings,ops.higherOrder))
// console.log(transformations(land,"dme,1,C/T",ops.landMappings,ops.higherOrder))
// console.log(transformations(land,"dah->(2*@)->dmg,A",ops.landMappings,ops.higherOrder))
// console.log(transformations(land,"(2*`dah`+`dah`)->dmg,A",ops.landMappings,ops.higherOrder))

const parse = (str) => {
    console.log(transformations(land,str,ops.landMappings,ops.higherOrder));
}


// parse("adj->ftr,S/M->sum->dmg,(`bli` > @ - `twn` ? 2 * `dah` : 1),T/S");
// parse("adj->ftr,O->sum->dmg,(@ > 0 ? 2 : 1),A")
// parse("des,(`cit`+`twn`+`trp`),A")
// parse("rge,0,4->sum->rge,0,@->sum")

parse("([1,2,3,4,5])->(@+1)->~cjp,(`sum` < 100),1")
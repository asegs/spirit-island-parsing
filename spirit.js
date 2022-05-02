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
        let subCodes = opCode.split(",");
        subCodes = subCodes.map(code => {
            if (code.includes("/")) {
                return code.split("/")
            }
            return code;
        })
        if (pos === opCodes.length - 1) {
            if (opCode.includes("@")) {
                subCodes = subCodes.map(code=>{return advancedOpCodeReplace(code,currentArgument)});
                return targetMap[subCodes[0]](target,...subCodes.slice(1));
            }else {
                if (currentArgument) {
                    return targetMap[subCodes[0]](target,currentArgument,...subCodes.slice(1));
                }else {
                    return targetMap[subCodes[0]](target,...subCodes.slice(1));
                }
            }
        }
        if (isIterable(currentArgument)) {
            if (isAdvancedOpCode(opCode)) {
                currentArgument = currentArgument.map(value => {return eval(advancedOpCodeReplace(opCode,value))});
            }else {
                opCode = subCodes[0];
                if (Object.keys(reducers).includes(opCode)) {
                    subCodes = subCodes.map(code=>{return advancedOpCodeReplace(code,currentArgument)})
                    currentArgument = reducers[opCode](currentArgument,...subCodes.slice(1))
                }else {
                    currentArgument = currentArgument.map(t => {
                        return targetMap[opCode](t,...subCodes.slice(1))
                    });
                }
            }
        }else{
            if (isAdvancedOpCode(opCode)) {
                currentArgument = eval(advancedOpCodeReplace(opCode,currentArgument));
            }else {
                subCodes = subCodes.map(code=>{return advancedOpCodeReplace(code,currentArgument)})
                opCode = subCodes[0];
                //Want to keep the current value as default fill in
                currentArgument = targetMap[opCode](target,...subCodes.slice(1))
            }
        }
        pos++;
    }
    return currentArgument
}

const advancedOpCodeReplace = (string,currentArgument) => {
    if (typeof string !== "string") {return string}
    return string.replace("@",JSON.stringify(currentArgument));
}

const isAdvancedOpCode = (string) => {
    return string[0] === "(" && string[string.length - 1] === ")";
}


const adj1 = types.Land("S",[],blight = 1);
const adj2 = types.Land("M",[],blight=1);
const adj3 = types.Land("W",[])
const land = types.Land("J", [adj1,adj2,adj3], blight = 2,towns = 2,0,3);

console.log(transformations(land,"adj->ftr,S/M->bli->sum->rep,T,S,@,@",ops.landMappings,ops.higherOrder));
console.log(transformations(land,"set->ftr,J/S->sum->(@ == 0 ? 1 : 4)->def",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"dah->dmg,A",ops.landMappings,ops.higherOrder))
console.log(transformations(land,"dme,1,C/T",ops.landMappings,ops.higherOrder))

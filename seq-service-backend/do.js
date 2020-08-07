const fs = require('fs')
const moment = require('moment')
/*
function modifyJsCode(jsCode){
    return "JSON.stringify((function f(arg, constantArg){" + jsCode + "})(arg," +
                "constantArg ))";
}
let js = modifyJsCode( fs.readFileSync('match_seqs_v3_js.js', 'utf8') )
let constantArg = JSON.parse( fs.readFileSync('constarg.js', 'utf8') )*/

function excuteJS(seqContent, funJs, constantArg, funFilter, arrCol, outputCol, stringifyOutput, keepArrCol, stringifyArrCol){ 
   // console.log(js)
    let content
    try{
      content = JSON.parse(seqContent)  
    }catch(e){
      console.log(`error parsing seqContent=${seqContent}`)
      return "SEQJS ERROR"
    }
    let row = content
    try{
      if( !funFilter(row) ){
        return "NOT FILTER"
      }  
    }
    catch(e){
      return "FILTER ERROR"
    }
    var obj
    if(typeof(content[arrCol])  == "string"){
      obj = JSON.parse( content[arrCol] )
    }
    else{
      obj = content[arrCol]
    }

    if(!keepArrCol){
      delete content[arrCol]
    }
    else{
      if(!stringifyArrCol){
        content[arrCol] = JSON.parse(content[arrCol])
      }
    }
    //delete content[arrCol]
//    let js = modifyJsCode( fs.readFileSync('match_seqs_v3_js.js', 'utf8') )
  //  let constantArg = JSON.parse( fs.readFileSync('constarg.js', 'utf8') )
    let arg = obj
    var result

    try{
        if(stringifyOutput){
          result = JSON.stringify(funJs(arg, constantArg))
        }
        else{
          result = funJs(arg, constantArg)
        }
    }
    catch(e){
        console.log("seqjs error!")
        console.log(e)
        return "SEQJS ERROR"
    }
   // content.set("result", JSON.stringify(result) )
    content[outputCol] = result
   // console.log(JSON.stringify(content))
    return JSON.stringify(content)

    //{a,b, arr = ""} => {a,b, result:".." }
}

module.exports = excuteJS;

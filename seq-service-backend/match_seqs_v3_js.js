//author: 李斯宁
//2018-05-31: 增加了按月统计出现次数的方式。所谓按月，是按整月。


var arg;
var constantArg;

//多个 标准序列，分别要做match
var seqs = constantArg.seqs;

//debug
//return JSON.stringify(seqs);

//时间范围，半开半闭
var tsStart = constantArg.tsStart;
var tsEnd = constantArg.tsEnd;

//日期范围，闭区间
var fromDate = constantArg.fromDate;
var toDate = constantArg.toDate;

//用户序列
var arr = arg;

//如果没有day列，则加上
for(var i=0; i<arr.length; i++ ) {
  if( arr[i].day == undefined && arr[i].ts != undefined) {
    var d = moment.utc(arr[i].ts).local().format('YYYY-MM-DD');
    arr[i].day = d;
  }
}
    
//先做时间过滤
var newArr = [];
if( tsStart != undefined ) {
  //时间戳过滤，半开半闭
  for(var i=0; i<arr.length; i++ ) {
    if( arr[i].ts >= tsStart && arr[i].ts < tsEnd) {
      newArr.push(arr[i]);
    }
  }
}else if(fromDate != undefined ){
  //日期过滤，闭区间
  for(var i=0; i<arr.length; i++ ) {
    var d = arr[i].day;
    if( d >= fromDate && d <= toDate) {
      newArr.push(arr[i]);
    }
  }
}else{
  //不做过滤
  newArr = arr;
}

//计算节点
function doCollect(node, ext, arr, matchedPos){
  //debug beg
  // if( ext.tag == undefined ){
  //   ext.tag = JSON.stringify(cond);
  // } else {
  //   ext.tag = ext.tag + JSON.stringify(cond);
  // }
  //debug end
  
  // if( cond.compiled !== true ) {
  //   cond.evaluate = eval("(function e(arr, matchedPos){"
  //     + cond.expr + "})");
  //   cond.compiled = true;
  // }
  // debugger;
  // //debug
  // // ext[cond.col] = 100.0;
  // var v = cond.evaluate(arr, matchedPos);
  // ext[cond.col] = v;
  // return true;
  
  var from; //闭
  var to; //开
  if( node.pos_range == 'last-match-to-end' ){
    from = matchedPos[matchedPos.length - 1];
    to = arr.length;
  }else if( node.pos_range == 'last-match') {
    from = matchedPos[matchedPos.length - 1];
    to = from + 1;
  }else{
    throw "pos_range must be 'last-match-to-end' or 'last-match'";
  }
  debugger;
  var prefix = "";
  if( node.prefix ) {
    prefix = node.prefix + "_";
  }
  if( node.metric && node.metric.sum ) {
    var col = node.metric.sum;
    var s = 0;
    for(var i=from; i<to; i++ ) {
      if( node.cond == undefined || tryMatch(node.cond, arr[i] ) ) {
        if( arr[i][col] != undefined ) {
          s += arr[i][col];
        }
      }
    }
    ext[prefix+'sum_' + col] = s;
  }
  
  if( node.metric && node.metric.occur_in_day_ranges ) {
      //转换到新的格式
      var stat = node.metric.occur_in_day_ranges;
      node.metric.stat_in_day_ranges = stat;
      delete node.metric.occur_in_day_ranges;
      stat.type = "occur";
      stat.isDeprecateFormat = true;
  }  
    
  if( node.metric && (node.metric.stat_in_day_ranges || node.metric.stat_in_month_ranges) ) {
    var stat = node.metric.stat_in_day_ranges || node.metric.stat_in_month_ranges;
    var rangeGranu;
    if( node.metric.occur_in_day_ranges || node.metric.stat_in_day_ranges ) {
      rangeGranu = "DAY";
    }else if (node.metric.stat_in_month_ranges){
      rangeGranu = "MONTH";
    }
    
    var type = stat.type;
    var mode;
    if( type == 'occur' ) {
      mode = stat.mode || "times"; //once or times
      if( mode != "once" && mode != "times" ){
        throw "occur mode should be 'once' or 'times'!";
      }
    }
    
    var originMoment;
    if( stat.origin == 'last-match') {
      originMoment = moment(arr[matchedPos[matchedPos.length - 1]].day, "YYYY-MM-DD");
      if( rangeGranu == "MONTH" ) {
          originMoment.date(1); //设置为1号
      }
    }else{
      throw "(metric.occur_in_day_ranges / node.metric.stat_in_day_ranges /  node.metric.stat_in_month_ranges).origin must be 'last-match'";
    }
    var ranges = stat.ranges;
    
    var out = []; //输出初始化
    for(var i=0; i<ranges.length; i++) {
      out[i] = 0;
    }
    
    for(var i=from; i<to; i++) {
      if( node.cond == undefined || tryMatch(node.cond, arr[i])) {
        var diff;
        var aMoment = moment(arr[i].day);
        if( rangeGranu == "DAY" ) {
          diff = (aMoment - originMoment) / (3600 * 24 * 1000);
        }else{
          aMoment.date(1); //设置为1号
          diff = aMoment.diff(originMoment, 'months'); //月份之差
        }
        for(var j=0; j<ranges.length; j++) {
          if( diff >= ranges[j][0] && diff <= ranges[j][1]) {
            if( type == "occur" ) {
              if( mode == "times") {
                out[j] += 1;  //出现一个加1
              }else{
                out[j] = 1;  //出现设为1
              }
            }else{
              if( type == 'sum' ) {
                out[j] += arr[i][stat.target];
              }
            }
          }
        }
      }
    }
    if( type == 'occur' ) {
      ext[prefix + 'occur'] = out;
    }else{
      ext[prefix + type +'_'+stat.target] = out;
    }
  }
  
  if( node.metric && node.metric.collect_set ) {
    var col = node.metric.collect_set;
    var s = [];
    for(var i=from; i<to; i++ ) {
      if( node.cond == undefined || tryMatch(node.cond, arr[i] ) ) {
        if( arr[i][col] != undefined ) {
          s = _.union(s, arr[i][col]);
        }
      }
    }
    ext[prefix+'set_' + col] = s;
  }
  
  if( node.target ) {
    if( typeof(node.target) != "function" ){
      //transform to function
      var code = "(function(self, last_match){return " + node.target + "; })";
      node.target = eval(code);
    }
    var last_match = matchedPos.length>0?arr[matchedPos[matchedPos.length - 1]]:undefined;
    var s = [];
    for(var i=from; i<to; i++ ) {
      if( node.cond == undefined || tryMatch(node.cond, arr[i] ) ) {
        s.push( node.target(arr[i], last_match) );
      }
    }
    ext[prefix+'list'] = s;
  }
}

//匹配节点
function tryMatch(cond, evt) {
  for(var c in cond) {
    if( c == 'op' ) {
      //跳过op属性，如果有的话，它应该是'match'
      continue;
    }
    if( c == 'evaluate' || c == 'compiled') {
      //跳过evaluate、compiled属性
    }
  
    if(evt[c] == undefined ) { //evt没有对应的属性c
      return false;
    }else{
      var criteria = cond[c];
      if(criteria instanceof Array ) {
        //数组
        if( ! _.contains(criteria, evt[c]) ) {
          return false;
        }
      }else if(typeof(criteria) == "function"){
        if( !criteria(evt[c])) {
          return false;
        }
      }else if(criteria instanceof RegExp) {
        if( evt[c] == null || evt[c] == undefined || evt[c].match(criteria) == null )  {
          return false;
        }
      }else if(criteria.indexOf('cond:') == 0) {
        //表达式
        var e = criteria.substring('cond:'.length);
        var f = eval("(function f($){ return (" + e + ");})");
        cond[c] = f;
        if( ! f(evt[c]) ) {
          return false;
        }
      }else if(criteria.indexOf('re:') == 0) {
        //正则
        var e = criteria.substring('re:'.length);
        var r = new RegExp(e);
        cond[c] = r;
        var s = evt[c];
        if( s == null || s == undefined || s.match(r) == null) { //匹配失败
          return false;
        }
      }else{
        if(evt[c] != criteria) {
          return false;
        }
      }
    }
  }
  return true;
}

//每个标准序列
var ret = {};
var cntArr = [];
var extArr = [];
debugger;
for(var i=0; i<seqs.length; i++) {
  var seq = seqs[i];
  var ext = {}; //搜集额外信息
  
  //debug
  // ext.seq = i;
  
  var matched = 0; //已经match的数量
  var matchedPos = [];
  
  for( var j=0; j<newArr.length; j++ ) {
    var cond = seq[matched];
    
    //默认为match
    if( cond.op == undefined || cond.op == 'match') {
      if(tryMatch(cond, newArr[j]) ) {
        matchedPos[matched] = j;
        matched++;
        if( matched == seq.length) {
          break;
        }
      }
    }
    
    //如果下一个节点是计算节点，则处理之
    while( matched < seq.length) {
      var nextCond = seq[matched]
      if( nextCond.op == 'collect') {
        //计算节点，特殊处理
        doCollect(nextCond, ext, newArr, matchedPos);
        //原地匹配
        matchedPos[matched] = j;
        matched++;
      }else{
        break;
      }
    }
    
    if( matched == seq.length) {
      break;
    }
  }
  
  if( matched == seq.length) {
    //都match了
    cntArr[i] = 1;
  }else{
    cntArr[i] = 0;
  }
  
  extArr[i] = ext;
}

// var uuid = undefined;
// if( this.Packages ) {
//   uuid = Packages.java.util.UUID.randomUUID().toString();
// }
//返回是否match
ret = {
  cnt: cntArr,
  ext: extArr
  // uuid: uuid
  // ,
  // constantArg: JSON.stringify(constantArg),
  // arg: JSON.stringify(arg)
};
debugger;
return ret;
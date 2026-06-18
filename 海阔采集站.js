/**
 * 使用说明
 * 版本：1.0.0
 * 日期：2026-06-18
 * 作者：badmon
 * 功能描述：海阔调用脚本，直接访问采集站
 * 调用方法：在首页解析规则处填写如下代码
js:
  jspath="file:///storage/emulated/0/pictures/HKtvbox/函数.js"
  my=$.require(jspath)
  my.显示网站列表()
 * 注意： jspath 为本文件所在路径，需要根据实际情况修改
 * 存在问题：
 *  1、m3u8去广告还没有完成
 *  2、推送到TVBOX为本地线路还没有完成
 */
const local = "file:///storage/emulated/0/";
var localPath = local+"pictures/HKtvbox/";
if(!fileExist(localPath)){
  localPath=local+"HKtvbox/"
}
aliFile = "https://aliyun-wb-abpb21pjek.oss-cn-shanghai.aliyuncs.com/fc/%E5%88%87%E7%89%87%E7%BD%91%E4%BF%9D%E5%AD%98_2025-10-31.json"
//网站列表接口,测试数据
// 返回样式按钮
function getcols() {
  cols = [
    "text_1",
    "text_2",
    "movie_1",
    "movie_2",
    "movie_3",
    "movie_1_left_pic",
    "movie_1_vertical_pic_blur",
    "movie_3_marquee",
    "pic_1",
    "pic_2",
    "pic_1_full",
    "pic_1_center",
    "pic_3_square",
    "pic_1_card",
    "pic_2_card",
  ];
  ret = [];
  for (let i = 0; i < cols.length; i++) {
    ret.push({
      col_type: "scroll_button",
      title: cols[i],
      url: $().lazyRule((c) => {
        putMyVar("mycol", c);
        refreshPage(false);
      }, cols[i]),
    });
  }
  return ret;
}
// 长按菜单
function longck(url) {
  lck = [
    {
      title: "调试",
      js: $.toString((url) => {
        return "hiker://debug?url=" + url;
      }, url),
    },
    {
      title: "浏览",
      js: $.toString((url) => {
        return "web://" + url;
      }, url),
    },
    {
      title: "复制",
      js: $.toString((url) => {
        log("复制链接：" + url);
        return "copy://" + url;
      }, url),
    },
  ];
  return lck;
}

//返回的是D列表 需要再添加的显示数组中
function 显示列表(list, col, title, desc, img, url, extra, nextpg,lck) {
  ret = [];

  for (var j = 0; j < list.length; j++) {
    var obj = Object.assign({}, extra || {}); // 确保extra存在，防止undefined

    obj = Object.assign({}, list[j])
    if(obj.url===undefined){
      obj.url=list[j][url]
    }
    //将当前项添加到返回数组中
    if(lck!==undefined){
      obj.longClick = lck(list[j][url]);
    }
    if(nextpg===undefined){
      nextpg=list[j][url]
    }
    ret.push({
      col_type: col,
      title: "【 " + list[j][title] + " 】",
      desc: list[j][desc],
      img: list[j][img],
      // url:list[j][url],
      url: nextpg,
      extra: obj,
    });
  }
  return ret;
}
function 显示双层列表(list1,list2,col,title,desc,img,url,extra,nextpg,lck){
  ret = [];
  for (var j = 0; j < list1.length; j++) {
    var obj = Object.assign({}, extra || {}); // 确保extra存在，防止undefined

    obj = Object.assign({}, list1[j])
    if(obj.url===undefined){
      obj.url=list1[j][url]
    }
    if(lck!==undefined){
      obj.longClick = lck(list1[j][url]);
    }
    ret.push({
      col_type: "text_center_1",
      title: "【 " + list1[j][title] + " 】",
      desc: list1[j][desc],
      img: list1[j][img],
      url: nextpg,
      extra: obj,
    });
    ret = ret.concat(
      显示列表(list1[j][list2],col,title,desc,img,url,extra,nextpg,lck)
    );
  }

  return ret;
}

function 单转双pid(list, key) {
  // 使用const声明变量，避免全局作用域污染
  const ret = [];
  // 参数验证，避免空数组或非数组输入导致错误
  if (!Array.isArray(list)) {
    log("单转双pid函数：输入参数list不是数组");
    return ret;
  }

  try {
    // 第一遍遍历：找出所有父项（key值为0的项）
    for (let j = 0; j < list.length; j++) {
      if (list[j] && typeof list[j] === "object" && list[j][key] === 0) {
        parentItem = Object.assign({}, list[j]);
        parentItem.list = [];
        //log(parentItem);
        ret.push(parentItem);
      }
    }

    // 第二遍遍历：将子项分配到对应的父项中
    for (let j = 0; j < ret.length; j++) {
      parentId = ret[j].type_id;
      if (parentId !== undefined) {
        for (let k = 0; k < list.length; k++) {
          if (list[k][key] === parentId) {
            ret[j].list.push(list[k]);
          }
        }
      }
    }

    return ret;
  } catch (error) {
    // 错误处理，确保函数不会崩溃
    log("单转双pid函数执行错误：" + error.message);
    return ret;
  }
}

function 跳转(str) {
  const 跳转 = $('hiker://empty##fypage').rule(
    (file, str) => {
      const 函数 = $.require(file);
      函数[str]();
    },
    localPath + "函数.js",
    str
  );
  return 跳转;
}

function 展示页() {
  webobj = MY_PARAMS;
  log('展示页开始--------------------');
  d=[]
  toast(MY_PAGE+'页');
  if(MY_PAGE===1){
    setPreResult(getcols());
  }
  mj = JSON.parse(fetch(webobj.url+'&pg='+MY_PAGE));
  col=getMyVar('mycol','movie_3');
  d=显示列表(mj.list,col,"vod_name","type_name","vod_pic","vod_id",{},跳转("详情页"));
  //log(mj.list);
  setResult(d);
}
function 栏目页() {
  log('栏目页开始--------------------');
  webobj = MY_PARAMS;
  mj = JSON.parse(fetch(webobj.url));
  //log(webobj)
  if(mj.class[0].type_pid!==undefined){
  ss = 单转双pid(mj.class, "type_pid");
  d = 显示双层列表(ss, "list", "text_2", "type_name", "", "", "type_id", {}, 跳转("展示页"),longck);
  }else{
    d=显示列表(mj.class,"text_2","type_name","","","type_id",{},跳转("展示页"),longck);
  }
  处理采集网站url(webobj.url,'栏目');
  setResult(d);
}
function 详情页(){
  log('详情页开始--------------------');
  webobj = MY_PARAMS;
  d=[]
  col=getMyVar('mycol','movie_3');
  d.push({
    col_type: 'pic_1_full',
    img: webobj.vod_pic,
  })
  d.push({
    col_type: 'text_center_1',
    title: webobj.vod_name,
    desc: webobj.vod_time,
  })
  dd=取播放链接(webobj.vod_play_url,'video://');
//log(dd)
  setResult(d.concat(显示双层列表(dd,"list","text_2","title","","","url",{})));
}
function 取播放链接(str,addstr){
  ret=[];
  xl=str.split('$$$');
  for (let j = 0; j < xl.length; j++) {
    xls = {};
    xls.title = "线路:" + j;
    xls.list = [];
    ji = xl[j].split("#");
    for (let k = 0; k < ji.length; k++) {
      ming = ji[k].split("$");
      if (ming.length > 1) {
        xls.list.push({
          title: ming[0],
          url: addstr + ming[1],
        });
      }else{
        xls.list.push({
          title: '点击播放',
          url: addstr + ming[0],
        });
      }
    }
    ret.push(xls);
  }

  return ret;
}  
function 处理采集网站url(url, tg) {
  url=url.split('?')[0];
  for (let j = 0; j < d.length; j++) {
    let currentUrl = d[j].extra.url;
    if (typeof currentUrl !== "string") {
      currentUrl = String(currentUrl);
    }
    if (!currentUrl.startsWith("http")) {
      if (tg == "栏目") {
        d[j].extra.url = `${url}?ac=videolist&t=${currentUrl}}`;
      }
      if (tg == "展示") {
        d[j].extra.url = `${url}?ac=videodetail&ids=${currentUrl}`;
      }
    }
  }
}

function 显示网站列表(url) {
  if (!url) {
    if(fileExist(localPath+"caiji.json")){
      url=localPath+"caiji.json";
    }else{
      url=aliFile;
    }
  }
  mj=JSON.parse(fetch(url));
  ret=[{
    col_type: "text_center_1",
    title: "【 现有采集网站列表 】",
    desc: url.replace("file:///storage/emulated/0","")
  }]
  ret = ret.concat(显示列表(mj,"text_2","title","","","url",{},跳转("栏目页"),longck));
  setResult(ret);
}

$.exports = {
  显示网站列表: 显示网站列表,
  展示页: 展示页,
  栏目页: 栏目页,
  详情页: 详情页,
};

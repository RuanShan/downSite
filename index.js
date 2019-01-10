var fs = require("fs");
var path = require('path');
var cheerio = require('cheerio');
var async = require("async");
var request = require('request');
var index = 1;
var mainUrl = 'http://moban.cn86.cn:8000/w90124/';

var linkList = mainUrl.split('/');
var mainDir = linkList[linkList.length - 2];
// 创建初始目录 包含images 目录(因为下面下载图片的时候无法没有提前生成目录)
fs.mkdir(mainDir+"/images/", { recursive: true }, (err) => {
    if (err) { console.log(err) };
});


// 获取文件名
function getFileName($url) {
    var pos = $url.lastIndexOf('/');
    var poss = $url.lastIndexOf('?');
    if ( poss !== -1) {
        return $url.substring(pos+1, poss)
    } else {
        return $url.substr(pos+1)
    }
}

var htmlPath = [
    {url: mainUrl, name: 'index.html'},
    {url: mainUrl+'about/',  name:'about.html'},
    {url: mainUrl+'case/',  name:'case.html'},
    {url: mainUrl+'product/',  name:'product.html'},
    {url: mainUrl+'news/',  name:'news.html'},
    {url: mainUrl+'message/',  name:'message.html'}
]

htmlPath.forEach(function(item,index,arr){
    request(item.url, function(error, response, body) {
        if (!error && response && response.statusCode == 200) {
            var $ = cheerio.load(body, {decodeEntities: false});

            // 替换导航路径
            for (var x = 0; x < arr.length; x++) {
                $('a[href="'+arr[x].url+'"]').attr('href',arr[x].name).addClass('replace');
            }
            $('a[href]').each(function () { 
                if (!$(this).hasClass("replace")) {
                    $(this).attr('href', 'javascript:;');
                }
             })
    
            /* 下载图片 */
             // 这种格式无法下载(http://moban.cn86.cn:8000/W80283/data/include/imagecode.php?act=verifycode) 
            // 一般是验证码，验证吗通常都有 id="checkCodeImg"
            $('img[id="checkCodeImg"]').remove();

            var imageLinks = []
            $('img[src]').each(function(){
                var src = $(this).attr('src');
    
                // 替换路径
                var newSrc = "./images/"+getFileName(src);
                $(this).attr('src', newSrc);

                // 补全图片路径
                if (src.indexOf(mainUrl) == -1 && src !== "") {
                    if( src.indexOf(mainDir) != -1) {
                        src= mainUrl.replace(mainDir,'')+src;
                    } else {
                        src= mainUrl+src;
                    }
                }
                // 如果处理过的链接和主链接相同则表示为空链接，则不保存到图片数组中
                if (src == mainUrl) {
                    return;
                }
                // 保存验证好的链接到数组中
                imageLinks.push(src);
            })
            // 下载图片函数
            var downloadImage = function(src, dest, callback) {
                request.head(src, function(err, res, body) {
                    if (src) {
                        request(src).pipe(fs.createWriteStream(dest)).on('close', function() {
                            callback(null, dest);
                        });
                    }
                });
            };
            // 异步下载图片
            async.mapSeries(imageLinks, function(item, callback) {
                setTimeout(function() {
                    if (item.indexOf(mainUrl) === 0) {
                        var destImage = path.resolve(mainDir+"/images/", item.split("/")[item.split("/").length -1]);
                        downloadImage(item, destImage, function(err, data){
                            console.log("["+ index++ +"]: " + data);
                        });
                    }
                    callback(null, item);
                }, 100);
            }, function(err, results) {});
    
            // 保存文件函数
            function saveFile(el, dir, attr) {
                // 判断目录是否存在，如果不存在则创建该目录
                fs.mkdir(mainDir+"/"+dir, { recursive: true }, (err) => {
                    if (err) { console.log(err) };
                });
    
                // 保存并修改文件路径
                $(el).each(function(i){
                    // 获取路径
                    var urls = $(this).attr(attr);
                    
                    // 更新路径
                    var newUrl = "./"+dir+"/"+getFileName(urls);
                    $(this).attr(attr,newUrl);

                    // 通过路径进行http请求
                    request(urls, function (error, response, body){
                        // 保存文件
                        fs.writeFile(path.join(__dirname, mainDir+"/"+dir, getFileName(urls)), body, function (error) {
                            if (error) {
                                console.log(error)
                            }
                            console.log('['+i+']',urls);
                        })
                        // 如果目录是 style 则下载里面的链接
                        if (dir == 'style' ) {
                            var cssStr = body;
                            var regExp = /\.\.\/images\/(\w+)\.(png|jpg|gif)/g;
                            var result = cssStr.match(regExp);
                            if (result) {
                                result.forEach(function(item,index,array) {
                                    var item = item.replace('../','template/default/');
                                    result[index] = mainUrl+item
                                })
                            }
                            // console.log(result);
                            // 异步下载图片
                            async.mapSeries(result, function(item, callback) {
                                setTimeout(function() {
                                    if (item.indexOf(mainUrl) === 0) {
                                        var destImage = path.resolve(mainDir+"/images/", item.split("/")[item.split("/").length -1]);
                                        downloadImage(item, destImage, function(err, data){
                                            console.log("["+ index++ +"]: " + data);
                                        });
                                        
                                    }
                                    callback(null, item);
                                }, 100);
                            }, function(err, results) {});
                        }
                    })
                    
                })
            }
            
            saveFile("script[src]", "js", "src");
            saveFile("link[href]", "style", "href");
    
            fs.writeFile(path.join(__dirname, mainDir, item.name), $.html(), 'utf8', (err) => {
                if (err) console.log(err);
                console.log(item.name+'已保存');
            });
        }
    });
})

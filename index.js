var fs = require("fs");
var path = require('path');
var cheerio = require('cheerio');
var async = require("async");
var request = require('request');
var index = 1;
var mainUrl = 'http://moban.cn86.cn:8000/W80283/';

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
    {url: mainUrl+'news/',  name:'news.html'}
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
            var imageLinks = []
            $('img[src]').each(function(){
                var src = $(this).attr('src');
    
                // 替换路径
                var newSrc = "./images/"+getFileName(src);
                $(this).attr('src', newSrc);

                // 补全图片路径
                if (src.indexOf(mainUrl) == -1) {
                    if( src.indexOf(mainDir) != -1) {
                        src= mainUrl.replace(mainDir,'')+src;
                    } else {
                        src= mainUrl+src;
                    }
                }
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
                    var urls = $(this).attr(attr);
                    var newUrl = "./"+dir+"/"+getFileName(urls);
                    $(this).attr(attr,newUrl);
                    request(urls, function (error, response, body){
                        fs.writeFile(path.join(__dirname, mainDir+"/"+dir, getFileName(urls)), body, function (error) {
                            if (error) {
                                console.log(error)
                            }
                            console.log('['+i+']',urls);
                        })
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

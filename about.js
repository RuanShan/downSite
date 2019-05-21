var fs = require("fs");
var path = require('path');
var cheerio = require('cheerio');
var async = require("async");
var request = require('request');

// 域名
var requestUrl = 'http://moban.cn86.cn:8000/k610195/';
//架构编号
var tplNum = 'k610195';
// 下载地址, 老站为空，新站要加域名
var domain = ''

// 创建初始目录 包含images 目录(因为下面下载图片的时候无法没有提前生成目录)
fs.mkdir(tplNum+"/images/", { recursive: true }, (err) => {
    if (err) { console.log(err) };
});

// 导航类名
var navClass = '#menu .nav a';
var htmlPath = [];

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

function createHtml (src) {
    if (src === '/') {
        return 'index.html'
    }
    if (src.indexOf('.html') !== -1) {
        return src.split('/')[src.split('/').length - 1]
    } else {
        return src.split('/')[src.split('/').length - 2]+'.html'
    }
}


request(requestUrl, function(error, response, body) {
    if (!error && response && response.statusCode == 200) {
        var $ = cheerio.load(body, {decodeEntities: false});

        // 将导航中包含的链接，存储到数组中
        $(navClass).each(function(){
            var href = $(this).attr('href')
            htmlPath.push({url: href, name: createHtml(href)})
        })

        // console.log(htmlPath)
        // return false;

        htmlPath.forEach(function(item,index,arr){
            request(domain+item.url, function(error, response, body) {
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
                        if (src.indexOf(requestUrl) == -1 && src !== "") {
                            if( src.indexOf(tplNum) != -1) {
                                // 如果不加'/'的话会生成 /// 这样链接 会导致图片下载不下来
                                // 通常是通过说明页添加的图片 类似 /w90175/data/upload/image/20180919/1537321920480621.png
                                src= requestUrl.replace("/"+tplNum+"/",'')+src;
                            } else {
                                src= requestUrl+src;
                            }
                        }
                        // 如果处理过的链接和主链接相同则表示为空链接，则不保存到图片数组中
                        if (src == requestUrl) {
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
                            if (item.indexOf(requestUrl) === 0) {
                                var destImage = path.resolve(tplNum+"/images/", item.split("/")[item.split("/").length -1]);
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
                        fs.mkdir(tplNum+"/"+dir, { recursive: true }, (err) => {
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
                                // 判断文件是够存在，如果不存在则运行下面的代码
                                // 存在就跳过减少相同文件的下载
                                var filePath = path.join(__dirname, tplNum+"/"+dir, getFileName(urls));
                                fs.exists(filePath, function(exists) {
                                    if(!exists) {
                                        fs.writeFile(path.join(__dirname, tplNum+"/"+dir, getFileName(urls)), body, function (error) {
                                            if (error) {
                                                console.log(error)
                                            }
                                            console.log('['+i+']',urls);
                                        })

                                        // 如果目录是 style 则下载里面的链接
                                        if (dir == 'style' ) {
                                            var cssStr = body;
                                            var regExp = /\.\.\/images(\/\w+)?\/(\w+)\.(png|jpg|gif)/g;
                                            var result = cssStr.match(regExp);
                                            if (result) {
                                                result.forEach(function(item,index,array) {
                                                    var item = item.replace('../','template/default/')  ;
                                                    result[index] = requestUrl+item
                                                })
                                            }
                                            var newResult = Array.from(new Set(result))
                                            // 异步下载图片
                                            async.mapSeries(newResult, function(item, callback) {
                                                setTimeout(function() {
                                                    if (item.indexOf(requestUrl) === 0) {
                                                        var destImage = path.resolve(tplNum+"/images/", item.split("/")[item.split("/").length -1]);
                                                        downloadImage(item, destImage, function(err, data){
                                                            console.log("["+ index++ +"]: " + data);
                                                        });
                                                        
                                                    }
                                                    callback(null, item);
                                                }, 100);
                                            }, function(err, results) {});
                                            
                                            // 删除二级目录
                                            var newBody = body.replace(/\.\.\/images(\/\w+)?/g, '../images')
                                            // 保存文件
                                            fs.writeFile(path.join(__dirname, tplNum+"/"+dir, getFileName(urls)), newBody, function (error) {
                                                if (error) {
                                                    console.log(error)
                                                }
                                                console.log('['+i+']',urls);
                                            })
                                        }
                                    }    
                                });
                            })
                        })
                    }
                    
                    saveFile("script[src]", "js", "src");
                    saveFile("link[href]", "style", "href");
            
                    fs.writeFile(path.join(__dirname, tplNum, item.name), $.html(), 'utf8', (err) => {
                        if (err) console.log(err);
                        console.log(item.name+'已保存');
                    });
                }
            });
        })
    }
});


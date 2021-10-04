var paragraphs = null;
var candidates_list = null;
var pg_set = 0;
var wordIdx = 0;
var outlist = [];

// Chooses paragraph based on URL
function displayParagraph(data) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    var pgNum = parseInt(urlParams.get('pg'));
    if (!Object.is(pgNum, NaN) && pgNum >= 0 && pgNum < data.length) {
        $( '#paragraph-container' ).css('display', 'block');
        $( '#curr' ).html(pgNum);
        $( "#pg" ).html(data[pgNum].Text); //.replace(/\n/g, "<br />")
        paragraphs = data[pgNum].Text;
        candidates_list = data[pgNum].Substitutes;
        generateView(0);
    } else {
        $( '#null-container' ).css('display', 'block');
    }
}
$.ajax({
    url: 'data/input.json',
    dataType: 'json',
}).done(displayParagraph);

// Sortable code
(function(b){b.support.touch="ontouchend" in document;if(!b.support.touch){return;}var c=b.ui.mouse.prototype,e=c._mouseInit,a;function d(g,h){if(g.originalEvent.touches.length>1){return;}g.preventDefault();var i=g.originalEvent.changedTouches[0],f=document.createEvent("MouseEvents");f.initMouseEvent(h,true,true,window,1,i.screenX,i.screenY,i.clientX,i.clientY,false,false,false,false,0,null);g.target.dispatchEvent(f);}c._touchStart=function(g){var f=this;if(a||!f._mouseCapture(g.originalEvent.changedTouches[0])){return;}a=true;f._touchMoved=false;d(g,"mouseover");d(g,"mousemove");d(g,"mousedown");};c._touchMove=function(f){if(!a){return;}this._touchMoved=true;d(f,"mousemove");};c._touchEnd=function(f){if(!a){return;}d(f,"mouseup");d(f,"mouseout");if(!this._touchMoved){d(f,"click");}a=false;};c._mouseInit=function(){var f=this;f.element.bind("touchstart",b.proxy(f,"_touchStart")).bind("touchmove",b.proxy(f,"_touchMove")).bind("touchend",b.proxy(f,"_touchEnd"));e.call(f);};})(jQuery);

function highlightWord(wordIdx) {
    document.getElementById('pg').innerHTML = paragraphs.substring(0, candidates_list[wordIdx][0]);
    var highlight = document.createElement("span");
    highlight.classList.add('highlighed-sent');
    highlight.innerHTML = " ".concat(paragraphs.substring(candidates_list[wordIdx][0], candidates_list[wordIdx][0] + candidates_list[wordIdx][2]).concat(" "));
    var word = document.createElement("span");
    word.classList.add('highlighted-word');
    word.innerHTML = " ".concat(paragraphs.substring(candidates_list[wordIdx][0] + candidates_list[wordIdx][2], candidates_list[wordIdx][0] + candidates_list[wordIdx][3]));
    highlight.appendChild(word);
    highlight.append(" ".concat(paragraphs.substring(candidates_list[wordIdx][0] + candidates_list[wordIdx][3], candidates_list[wordIdx][1]).concat(" ")));
    document.getElementById('pg').appendChild(highlight);
    document.getElementById('pg').append(paragraphs.substring(candidates_list[wordIdx][1]));
}

function generateView(wordIdx) {
    document.getElementById('word-list').innerHTML = '';
    highlightWord(wordIdx);
    let cands = candidates_list[wordIdx][4];

    // Generate Sortable Word List
    for (var k = 0; k < cands.length; k++) {
        let word = cands[k];
        let rb = cands[k][0];
        let re = cands[k][1];
        let sub = cands[k][2];

        var wordInput = document.createElement('li');
        wordInput.innerHTML = word[2];
        wordInput.classList.add('list-group-item');
        $(wordInput).on('click', function() {
            if (this.classList.contains('crossed-out')) {
                this.classList.remove('crossed-out');
            } else {
                var subList = document.getElementsByClassName('list-group-item');
                var mostRecent = null;
                for (var n = subList.length - 1; n > 0; n--) {
                    if (subList[n].classList.contains('crossed-out')) {
                        mostRecent = subList[n]
                    }
                }
                this.classList.add('crossed-out');
                this.remove();
                if (mostRecent == null) {
                    document.getElementById('word-list').appendChild(this);
                } else {
                    mostRecent.parentNode.insertBefore(this, mostRecent);
                }
                
            }
        });
        $(wordInput).mouseenter(function() {
            document.getElementById('pg').innerHTML = paragraphs.substring(0, candidates_list[wordIdx][0]);
            var highlight = document.createElement("span");
            highlight.classList.add('highlighed-sent');
            highlight.innerHTML = " ".concat(paragraphs.substring(candidates_list[wordIdx][0], candidates_list[wordIdx][0] + rb).concat(" "));
            var word = document.createElement("span");
            word.classList.add('highlighted-phrase');
            word.innerHTML = " ".concat(sub);
            highlight.appendChild(word);
            highlight.append(" ".concat(paragraphs.substring(candidates_list[wordIdx][0] + re, candidates_list[wordIdx][1]).concat(" ")));
            document.getElementById('pg').appendChild(highlight);
            document.getElementById('pg').append(paragraphs.substring(candidates_list[wordIdx][1]));
        }).mouseleave(function() {
            highlightWord(wordIdx);
        });
        document.getElementById('word-list').appendChild(wordInput);
    }
    $("#word-list").sortable().disableSelection();   
}

function submitForm() {
    var subOut = document.getElementsByClassName('list-group-item');
    var outprep = [];
    for (var k = 0; k < subOut.length; k++) {
        var crossed = subOut[k].classList.contains('crossed-out') ? 1:0;
        outprep.push([subOut[k].innerText, crossed]);
    }
    var sub = candidates_list[wordIdx];
    outlist.push([sub[0], sub[1], sub[2], sub[3], outprep]);
    if (wordIdx < candidates_list.length - 1) {
        generateView(++wordIdx);
    } else {
        console.log(outlist);
        document.getElementById('next-pg').classList.remove('hidden-pg');
        $('button#next-pg').on('click', function() {
            downloadData(outlist);
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            var pgNum = parseInt(urlParams.get('pg'));
            window.location.replace("ranking?pg=" + parseInt(pgNum + 1));
        });
        document.getElementById('submit').innerText = 'Export Data';
        $('button#submit').on('click', downloadData(outlist));
    }
}

function downloadData(data) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ranker_" + pg_set + "_output.bin");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

$('button#submit').on('click', function() {
    submitForm();
})

$(document).ready(function() {
    $('html').keyup(function(event) {
        if (event.which === 13) {
            event.preventDefault();
            submitForm();
        }
    });
});


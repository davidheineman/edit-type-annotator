// Sortable code
(function(b){b.support.touch="ontouchend" in document;if(!b.support.touch){return;}var c=b.ui.mouse.prototype,e=c._mouseInit,a;function d(g,h){if(g.originalEvent.touches.length>1){return;}g.preventDefault();var i=g.originalEvent.changedTouches[0],f=document.createEvent("MouseEvents");f.initMouseEvent(h,true,true,window,1,i.screenX,i.screenY,i.clientX,i.clientY,false,false,false,false,0,null);g.target.dispatchEvent(f);}c._touchStart=function(g){var f=this;if(a||!f._mouseCapture(g.originalEvent.changedTouches[0])){return;}a=true;f._touchMoved=false;d(g,"mouseover");d(g,"mousemove");d(g,"mousedown");};c._touchMove=function(f){if(!a){return;}this._touchMoved=true;d(f,"mousemove");};c._touchEnd=function(f){if(!a){return;}d(f,"mouseup");d(f,"mouseout");if(!this._touchMoved){d(f,"click");}a=false;};c._mouseInit=function(){var f=this;f.element.bind("touchstart",b.proxy(f,"_touchStart")).bind("touchmove",b.proxy(f,"_touchMove")).bind("touchend",b.proxy(f,"_touchEnd"));e.call(f);};})(jQuery);

// Finds the value of "s" in the URL and if it is valid, displays it
// https://[url]/index.html?s=0 => ID 0 in input.json
function displayAnnotator(data) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    var pgNum = parseInt(urlParams.get('s'));
    if (!Object.is(pgNum, NaN) && pgNum >= 0 && pgNum < data.length) {
        $( '#paragraph-container' ).css('display', 'block');
        $( '#curr' ).html(pgNum);
        generateView(data[pgNum]);
    } else {
        $( '#null-container' ).css('display', 'block');
    }
}

function generateView(sent) {
    $( "#input-sent-above").html(sent.Original);
    $( "#input-sent-below").html(sent.Original);


    createGroup(sent.Deletions, "#del-list");
    createGroup(sent.Paraphrases, "#par-list");
    createGroup(sent.Splittings, "#spt-list");
}

function createGroup(df, container_id) {
    for (var i = 0; i < df.length; i++) {
        // Write sentence
        let s = df[i][0];           // sentence
        let contr = "<p>";          // DOM container for sent
        
        // Write beginning of sentence
        contr = contr.concat(s.substring(0, df[i][1][1]));

        // Show edits
        for (var j = 1; j < df[i].length; j++) {
            let edit = df[i][j];

            // Add the non-annotated part of the sentence
            if (j > 1) {
                contr = contr.concat(s.substring(df[i][j - 1][2], edit[1]));
            }

            // Add spans for types of edits
            let edit_span = "<span";
            if (edit[0] == 0) {
                edit_span = edit_span.concat(' class="del">');
            } else if (edit[0] == 1) {
                edit_span = edit_span.concat(' class="par">');
            } else if (edit[0] == 2) {
                edit_span = edit_span.concat(' class="spt">');
            }
            edit_span = edit_span.concat(s.substring(edit[1], edit[2]));
            edit_span = edit_span.concat('</span>');

            contr = contr.concat(edit_span);
        }

        // Write end of sentence
        contr = contr.concat(s.substring(df[i].at(-1)[2]));

        contr = contr.concat("</p>");

        // Create col container for sentence
        let box = '<input type="text" class="form-control" aria-label="Score">'
        let div = "<div class='row'><div class='col-2'>" + box + "</div><div class='col-10'>" + contr + "</div></div>";
        let li = $("<li class='list-group-item'></li>").append($(div));
        
        $(container_id).append(li);
    }
    $(container_id).sortable().disableSelection();  
}

$.ajax({
    url: 'data/input.json',
    dataType: 'json',
}).done(displayAnnotator);
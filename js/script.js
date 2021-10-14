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
    $("#input-sent-above").html(sent.Original);
    $("#input-sent-below").html(sent.Original);
    $(".input-sent").html(sent.Original);


    createGroup(sent.Deletions, "#del-list");
    createGroup(sent.Paraphrases, "#par-list");
    createGroup(sent.Splittings, "#spt-list");
}

function createGroup(df, container_id) {
    for (let i = 0; i < df.length; i++) {
        // Write sentence
        let s = df[i][0];           // sentence
        let contr = "<p>";          // DOM container for sent
        
        // Write beginning of sentence
        contr = contr.concat(s.substring(0, df[i][1][1]));

        // Show edits
        for (let j = 1; j < df[i].length; j++) {
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
        let box = '<input min="0" max="100" class="form-control" aria-label="Score"><div class="invalid-feedback">Please enter a value 0-100</div>'
        let div = "<div class='row'><div class='col-2'>" + box + "</div><div class='col-10'>" + contr + "</div></div>";
        let li = $("<li class='list-group-item'></li>").append($(div));

        $(container_id).append(li);

        disableFormControl();
    }
    $(container_id).sortable().disableSelection();  
}

function disableFormControl() {
    $('.form-control').bind('keypress', function(e) {
        if (!(e.keyCode > 47 && e.keyCode < 58)) {
            // Check if the new char is non-numeric
            e.preventDefault();
        } else {
            // Check if the new value is out of bounds
            let nv = parseInt($(this).val() + String.fromCharCode(e.keyCode));
            if (nv > 100) {
                e.preventDefault();
                // add warning pop-up
                $($(this).parent().find('.form-control')).addClass('is-invalid');
            } else if (nv < 0) {
                // Don't need warning pop-up because less likely
                // console.log('Negative number!')
            } else {
                $($(this).parent().find('.form-control')).removeClass('is-invalid');
            }
        }
    })
    $('.form-control').on('change', function(e) {
        let nv = parseInt($(this).val() + String.fromCharCode(e.keyCode));
        if (nv < 100 && nv > 0) {
            $($(this).parent().find('.form-control')).removeClass('is-invalid');
        }
    })
}

var out  = [];

function submitForm() {
    let sent_out = {};

    sent_out['ID'] = parseInt((new URLSearchParams(window.location.search)).get('s'));
    sent_out['Original'] = $('#input-sent-above').text();
    sent_out['Deletions'] = parseSentList("#del-list");
    sent_out['Paraphrases'] = parseSentList("#par-list");
    sent_out['Splittings'] = parseSentList("#spt-list");

    out = out.concat(sent_out);
    downloadData(out);    
}

function parseSentList(container_id) {
    let out = [];
    $(container_id + " .list-group-item").each(function(i) {
        let entry = [];

        // get value of input
        entry.push(parseInt($($($($(this).children()[0]).children()[0]).children()[0]).val()));

        // get sentence
        entry.push($($($($(this).children()[0]).children()[1]).children()[0]).text());

        // get complete html
        let html = $($($($(this).children()[0]).children()[1]).children()[0]).html();

        // Parse edits from sentences
        let idx = 0;
        while (idx < html.length) {
            let next_substring = html.substring(idx, idx + 18);
            if (next_substring == '<span class="del">') {
                html = html.substring(0, idx) + html.substring(idx + 25);
                entry.push([0, idx, idx])
            } else if (next_substring == '<span class="spt">') {
                html = html.substring(0, idx) + html.substring(idx + 25);
                entry.push([2, idx, idx])
            } else if (next_substring == '<span class="par">') {
                // This one is different because there contains text in the span
                html = html.substring(0, idx) + html.substring(idx + 18);
                let found = false;
                let jdx = 0;
                while (!found) {
                    if (html.substring(jdx, jdx + 7) == '</span>') {
                        html = html.substring(0, jdx) + html.substring(jdx + 7);
                        found = true;
                    } else {
                        jdx++;
                    }
                }
                entry.push([1, idx, jdx])
            } else {
                idx++;
            }
        }
        out.push(entry);
    })
    return out;
}

// TODO: 
// [X] Handle form submission (get sentences, scores, package into json and download)
// [X] Prevent non-numeric or out of bounds inputs
// [X] Make much prettier
// [ ] Make even prettier
// [X] Add "instructions" button with pop-up hover thing
// [ ] Add ability to handle multiple sentences
        // is this necessary?
// [X] Add pop-up warning for out-of-bounds inputs

function downloadData(data) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "output.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

$.ajax({
    url: 'data/input.json',
    dataType: 'json',
}).done(displayAnnotator);

$('button#submit').on('click', function() {
    submitForm();
})

// Enable toggling of instructions modal using buttons
$('button#view-instructions').on('click', function() {
    $('#instructions').modal('toggle')
})

$('.modal-footer button').on('click', function() {
    $('#instructions').modal('toggle')
})
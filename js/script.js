// Finds the value of "s" in the URL and if it is valid, displays it
// https://[url]/index.html?s=0 => ID 0 in input.json
function displayAnnotatorWebDemo(data) {
    // For web demo, draw ID from URL
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

function displayAnnotatorMturk(data) {
    // For MTurk, draw ID from CSV
    $( '#paragraph-container' ).css('display', 'block');
    let s = parseInt($('#curr').text());
    generateView(data[s]);
}


function generateView(sent) {
    $("#input-sent-above").html(sent.Original);
    $("#input-sent-below").html(sent.Original);
    $(".input-sent").html(sent.Original);


    createGroup(sent.Deletions, "#del-list");
    createGroup(sent.Paraphrases, "#par-list");
    createGroup(sent.Splittings, "#spt-list");

    initFixButtons();
    initFixCaps();
}

function makeSortable(container_id) {
    new Sortable($(container_id)[0], {
        group: 'shared',
        animation: 150
    });
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
        let box = '<input min="0" max="100" class="form-control" aria-label="Score"><div class="invalid-feedback">Please enter a value 0-100</div><button type="button" class="btn btn-outline-secondary btn-fix" data-dismiss="modal">Fix</button>'
        let div = "<div class='row'><div class='col-2'>" + box + "</div><div class='col-10'>" + contr + "</div></div>";
        let li = $("<li class='list-group-item'></li>").append($(div));

        $(container_id).append(li);

        disableFormControl();
    }
    makeSortable(container_id);
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
    // Compile and submit data
    let sent_out = {};

    // sent_out['ID'] = parseInt((new URLSearchParams(window.location.search)).get('s'));
    sent_out['ID'] = parseInt($('#curr').text());
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

function initFixButtons() {
    $('.btn-fix').on('click', function() {
        $('#fix-spans').modal('toggle');

        // Get the paragraph to be fixed
        var p = $($($(this)[0]).parent()[0].nextSibling.childNodes[0]);

        $('#fix-spans-body')[0].innerHTML = p.html();
        initDiffFixer();

        $('#fix-spans-submit').on('click', function() {
            p[0].innerHTML = $('#fix-spans-body').html();
            $('#fix-spans').modal('toggle');
            $('#fix-spans-body, #fix-spans-submit, #fix-spans-cancel').off();
            initFixCaps();
        });
    
        $('#fix-spans-cancel').on('click', function() {
            $('#fix-spans-body').off();
            $('#fix-spans-body')[0].innerHTML = p.html();
            initDiffFixer();
        });
    });
}

function initFixCaps() {
    $('.par').each(function() {
        fixCaps(this);
    });
}

function fixCaps(e) {
    let first = $($(e).parent().children()).filter('.par').first()[0];
    if (first == e && $(e).parent().text().slice(0, 1).toUpperCase() == $(first).text().slice(0, 1).toUpperCase()) {
        $(e).addClass('caps');
    } else {
        $(e).removeClass('caps');
    }
}

// !!! DIFF FIXER CODE !!!!
function initDiffFixer() {
    // Add parahrase on highlight
    $('#fix-spans-body').on("mouseup", function (e) {
        var sel = window.getSelection()
        if (sel.anchorOffset != sel.focusOffset) {
            var rng = sel.getRangeAt(0);
            if (rng.commonAncestorContainer = $('#fix-spans-body')[0] && rng.startContainer == rng.endContainer) {
                var el = document.createElement("span");
                el.className = "par";

                var span = document.createElement('span');
                span.className = 'par';
                span.innerText = rng.toString();
                rng.deleteContents();
                rng.insertNode(span);
                rng.collapse(true);
                sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(rng);
            }
        }
        sel = window.getSelection();
        sel.removeAllRanges();
        $('#fix-spans-body')[0].normalize();
    });

    // Moving paraphrases
    $('#fix-spans-body').on("mousedown", '.par', function (e) {
        var parent = $(e.target).parent()[0];
        e.preventDefault();
        var curr = e.target;

        // Recreate the span
        var el = document.createElement("span");
        el.className = "par";

        // Sometimes the bounding box for the text container is off, fix this 
        var dir = "left"
        range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range.commonAncestorContainer.wholeText != e.target.innerText) {
            range = document.caretRangeFromPoint(e.clientX - 5, e.clientY);
        }
        if (range.startOffset > range.commonAncestorContainer.wholeText.length / 2) {
            dir = "right";
        }

        // See where the mouse is moving
        $('#fix-spans-body').on("mousemove", function(e) {
            var x = e.clientX, y = e.clientY;

            range = document.caretRangeFromPoint(x, y);

            var all =  $(curr)[0].innerText;
            var text1len = 0;
            // Prepend span
            if ($(curr)[0].previousSibling != null && $(curr)[0].previousSibling.wholeText != null) {
                all = $(curr)[0].previousSibling.wholeText + all;
                text1len = $(curr)[0].previousSibling.length;
            }
            // Postpend span
            if ($(curr)[0].nextSibling != null) {
                all = all + $(curr)[0].nextSibling.wholeText;
            }

            var spanlen = $(curr)[0].innerText.length;
            var start_idx, end_idx;

            // Default values if we're in other spans
            start_idx = text1len;
            end_idx = text1len + spanlen;

            // If we're moving outside the sentence
            if ($(range.commonAncestorContainer.parentElement).is(parent)) {
                if (dir == "left") {
                    start_idx = range.startOffset;
                    end_idx = text1len + spanlen;
                } else {
                    start_idx = text1len;
                    end_idx = text1len + spanlen + range.startOffset;    
                }
                // // If we're moving to the left
                // if ($(range.commonAncestorContainer.nextSibling).is(curr)) {
                //     start_idx = range.startOffset;
                //     end_idx = text1len + spanlen;
                // } 
                // // If we're moving to the right
                // else if ($(range.commonAncestorContainer.previousSibling).is(curr)) {
                //     start_idx = text1len;
                //     end_idx = text1len + spanlen + range.startOffset;
                // }
            } 
            // If we're moving within the sentence
            else if ($(range.commonAncestorContainer.parentElement).is(curr)) {
                if (dir == "left") {
                    // inner left
                    start_idx = text1len + range.startOffset;
                    end_idx = text1len + spanlen;
                } else {
                    // inner right
                    start_idx = text1len;
                    end_idx = text1len + range.startOffset;
                }
            }

            // console.log(all.substring(0, start_idx));
            // console.log(all.substring(start_idx, end_idx));
            // console.log(all.substring(end_idx));

            // Create a new text element if it didn't exist before
            if (!$(curr)[0].previousSibling) {
                var t = document.createTextNode(all.substring(0, start_idx));
                $(t).insertBefore($(curr)[0]); 
            } else if ($(curr)[0].previousSibling.nodeName == 'SPAN') {
                if (start_idx != text1len) {
                    var t = document.createTextNode(all.substring(0, start_idx));
                    $(t).insertBefore($(curr)[0]);
                }
            } else {
                $(curr)[0].previousSibling.textContent = all.substring(0, start_idx);
            }

            // Create a new text element if it didn't exist after
            if (!$(curr)[0].nextSibling){
                // If there is no next sibling, we need to create one
                var t = document.createTextNode(all.substring(end_idx));
                $(t).insertAfter($(curr)[0]);
            } else if ($(curr)[0].nextSibling.nodeName == 'SPAN') {
                if (end_idx != text1len + spanlen) {
                    var t = document.createTextNode(all.substring(end_idx));
                    $(t).insertAfter($(curr)[0]);
                }
            } else {
                $(curr)[0].nextSibling.textContent = all.substring(end_idx);
            }
            $(curr)[0].innerText = all.substring(start_idx, end_idx);
        })

        $('#fix-spans-body').on("mouseup", function () {
            $('#fix-spans-body').off("mousemove");
        });
    });

    // Moving deletions & paraphrases
    $('#fix-spans-body').on("mousedown", '.del, .spt', function (curr) {
        // Recreate the span
        var el = document.createElement("span");
        el.className = $(curr.target).attr("class");

        // Save the location of the original sentence the span was saved in
        var parent = $(curr.target).parent()[0];
        var orig = curr;
        var orig_target = curr.target;

        curr.preventDefault();
        
        $('#fix-spans-body').on("mousemove", function (curr) {
            var range, textRange, x = curr.clientX, y = curr.clientY;

            // Delete the old span
            $(curr).remove();
            $($(orig.target)).addClass("hidden-edit");
            
            // Try the standards-based way first
            if (document.caretPositionFromPoint) {
                var pos = document.caretPositionFromPoint(x, y);
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse();
            }
            // Next, the WebKit way
            else if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(x, y);
            }
            // Finally, the IE way
            else if (document.body.createTextRange) {
                textRange = document.body.createTextRange();
                textRange.moveToPoint(x, y);
                var spanId = "temp_" + ("" + Math.random()).slice(2);
                textRange.pasteHTML('<span id="' + spanId + '">&nbsp;</span>');
                var span = document.getElementById(spanId);
                //place the new pin
                span.parentNode.replaceChild(el, span);
            }

            // Place the new span
            if (range) {
                range.insertNode(el);
            }

            // Fix broken text spans
            el.previousSibling.parentNode.normalize();

            // Check if the new span is inside the paragraph
            var parent_new = $(el).parent()[0];
            if (!$(parent).is(parent_new)) {
                $(el).remove();
            }
        });

        // Remove the handler when the user has stopped dragging
        $('#fix-spans-body').on("mouseup", function () {
            $('#fix-spans-body').off("mousemove");

            // Check if the new span is inside the paragraph, if not, restore the original span
            var parent_new = $(el).parent()[0];
            if (!$(parent).is(parent_new)) {
                // Restore the original span
                $(orig_target).removeClass("hidden-edit");
                $(el).remove();
            } else {
                // Remove the original span
                $(orig_target).remove();

                // for each hidden edit, remove and normalize the parent
                $(".hidden-edit").each(function (i, elm) {
                    var temp = elm.parentNode;
                    $(elm).remove();
                    temp.normalize();
                });
            }        
            parent.normalize();
        });
    });

    // Allows double-clicking to delete spans
    // needs to not remove text on par removal
    $('#fix-spans-body').on("dblclick", '.par, .del, .spt', function(){
        // If there's children, add them to sibling
        if ($(this)[0].innerText.length != 0) {
            var contents = $(this)[0].innerText;
            var t = document.createTextNode(contents);
            $(t).insertBefore($(this)[0]);
            var temp = $(this)[0].parentNode;
            $(this).remove();
            temp.normalize();
        } else {
            $(this).remove();
        }
    });
}


function downloadData(data) {
    if (mturk) {
        // Import JSON data into mturk hit entry
        $('#mturk-hit').val(JSON.stringify(data));
    } else {
        // Download JSON data
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "output.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

$('button#submit').on('click', function() {
    // Check to make sure every sentence has a score
    let valid = true;
    $('.form-control').each(function() {
        if ($(this).val() == "") {
            $(this).addClass('is-invalid');
            valid = false;
        }
    })

    // If the entry is valid, submit the form
    if (valid) {
        submitForm();
    }
});
 
// Enable toggling of instructions modal using buttons
$('button#view-instructions, button#close-instructions').on('click', function() {
    $('#instructions').modal('toggle');
});

// For web demo, draw data from JSON file
function startupInterface(mturk) {
    if (mturk) {
        $.ajax({
            url: 'https://davidheineman.github.io/edit-type-annotator/data/input.json',
            dataType: 'json',
        }).done(displayAnnotatorMturk);
    } else {
        $.ajax({
            url: 'data/input.json',
            dataType: 'json',
        }).done(displayAnnotatorWebDemo);
    }
}



// Finds the value of "s" in the URL and if it is valid, displays it
// https://[url]/index.html?s=0 => ID 0 in input.json
function displayAnnotatorWebDemo(data) {
    // For web demo, draw ID from URL
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    // Starts interface
    var pgNum = parseInt(urlParams.get('s'));
    if (!Object.is(pgNum, NaN) && pgNum >= 0 && pgNum < data.length) {
        $( '#paragraph-container' ).css('display', 'block');
        $( '#curr' ).html(data[pgNum].ID);
        generateView(data[pgNum]);
    } else if (urlParams.get('viz') != null) {
        $.ajax({
            url: 'data/preliminary_output.json',
            dataType: 'json',
        }).done(displayAnnotatorWebVisualizer);
    } else {
        $( '#null-container' ).css('display', 'block');
    }    
}

function displayAnnotatorWebVisualizer(data) {
    // Allows for visualizing HIT data
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    var hitid = urlParams.get('viz');
    $( '#paragraph-container' ).css('display', 'block');
    
    // Searches data list for the first entry with the same ID as the MTurk .csv file
    let s_idx = -1;
    for (var entry in data) {
        if (data[entry].HIT_ID == hitid) {
            s_idx = parseInt(entry);
            break;
        }
    }
    if (s_idx == -1) {
        console.log("Error: ID not found");
        return;
    }

    $( '#curr' ).html(data[s_idx].HIT_ID);
    
    // modify data to not contain sentence ratings
    var data_mod = data[s_idx];
    let del = [], par = [], spt = [];
    for (var sent in data_mod.Deletions) {
        del.push(data_mod.Deletions[sent].shift());
    }
    for (var sent in data_mod.Paraphrases) {
        par.push(data_mod.Paraphrases[sent].shift());
    }
    for (var sent in data_mod.Splittings) {
        spt.push(data_mod.Splittings[sent].shift());
    }

    // everything else should render the same
    make_sortable = false;
    generateView(data_mod);

    // paste the numerical scores
    pasteValues(del, '#del-list');
    pasteValues(par, '#par-list');
    pasteValues(spt, '#spt-list');

    // prevent changing numerical scores or dragging the sentences
    $("input").prop('disabled', true);
    $(".btn-fix").addClass('hidden-pg');
    $('.header h4').css('margin-bottom', '1rem');
    $(".header .lead").html('Viewing HIT Results').addClass('header-label');
    $("#id-label").html('HIT ID: ');

    // change button to select next sentence
    if (s_idx < data.length - 2) {
        $('button#submit').text('See Next HIT').addClass('btn-primary').removeClass('btn-success');
        $('button#submit').off('click');
        $('button#submit').on('click', function() {
            window.location.href = window.location.pathname + '?viz=' + data[s_idx+1].HIT_ID;
        });
    } else {
        $('button#submit').addClass('hidden-pg');
    }
}

function pasteValues(scores, container_id) {
    let iter = 0;
    $(container_id + ' input').each(function() {
        this.value = scores[iter];
        iter++;
    });
}

function displayAnnotatorMturk(data) {
    // For MTurk, draw ID from CSV
    $( '#paragraph-container' ).css('display', 'block');
    let s = parseInt($('#curr').text());

    // Searches data list for the first entry with the same ID as the MTurk .csv file
    let s_idx = -1;
    for (var entry in data) {
        if (data[entry].ID == s) {
            s_idx = parseInt(entry);
            break;
        }
    }
    if (s_idx == -1) {
        console.log("Error: ID not found");
        return;
    }

    generateView(data[s_idx]);
}


function generateView(sent) {
    $("#input-sent-above").html(sent.Original);
    $("#input-sent-below").html(sent.Original);
    $(".input-sent").html(sent.Original);

    createGroup(sent.Deletions, "#del-list");
    createGroup(sent.Paraphrases, "#par-list");
    createGroup(sent.Splittings, "#spt-list");
 
    if (enable_fix_spans) {
        initFixButtons();
    }
    initFixCaps();
}

function makeSortable(container_id) {
    if (enable_sorting_between_categories) {
        $('#li-categorization').removeClass('li-hide');
        new Sortable($(container_id)[0], {
            group: 'shared',
            animation: 150
        });
    } else {
        new Sortable($(container_id)[0], {
            animation: 150
        });
    }
}

function createGroup(df, container_id) {
    for (let i = 0; i < df.length; i++) {
        // Write sentence
        let s = df[i][0];           // sentence
        let source = df[i][1];      // source
        let contr = "";             // container for sent
        
        // Write beginning of sentence
        contr = contr.concat(s.substring(0, df[i][1][1]));

        // Sorts edits in order of first index
        // This is just in case the input data is out of order
        if (df[i].length > 2)
            df[i] = df[i].slice(0, 2).concat(df[i].slice(2).sort(function(a, b) {
                return a[1] - b[1];
            }));

        // Show edits
        for (let j = 0; j < df[i].length; j++) {
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

        // Create col container for sentence
        let box = '<input min="0" max="100" class="form-control" aria-label="Score"><div class="invalid-feedback">Please enter a value 0-100</div><button type="button" class="btn btn-outline-secondary btn-fix btn-hide" data-dismiss="modal">Fix</button>'
        let div = "<div class='row' source='" + source + "'><div class='col-2'>" + box + "</div><div class='col-10'><p>" + contr + "</p></div></div>";
        let li = $("<li class='list-group-item'></li>").append($(div));

        $(container_id).append(li);

        disableFormControl();
    }
    // Remove all sets of || chars that could have been hard-coded in the split data
    $(container_id).html($(container_id).html().replace(/\|\|/g, ''));

    if(make_sortable) {
        makeSortable(container_id);
    }
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

    // We now want to include the sentence split || chars in the output. Add them back in.
    $(container_id + ' .spt').html('||')

    let out = [];
    $(container_id + " .list-group-item").each(function(i) {
        let entry = [];

        // get value of input
        entry.push(parseInt($($($($(this).children()[0]).children()[0]).children()[0]).val()));

        // get sentence
        entry.push($($($($(this).children()[0]).children()[1]).children()[0]).text());

        // get source
        entry.push($($(this).children()[0])[0].attributes[1].value);

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

var resetDiffFixer;

function initFixButtons() {
    $('#li-fix').removeClass('li-hide')

    $('.btn-fix').removeClass('btn-hide');

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

        // We make this a global variable so we can call it in initDiffFixer()
        resetDiffFixer = function() {
            $('#fix-spans-body').off();
            $('#fix-spans-body')[0].innerHTML = p.html();
            initDiffFixer();
        }
    
        $('#fix-spans-cancel').on('click', resetDiffFixer);
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
        var sent_orig = $('#fix-spans-body').text();

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

            // If the sentence text is modified due to some bug, reset the interface
            if (sent_orig != $('#fix-spans-body').text()) {
                resetDiffFixer();
            };
        });     

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

// Allow modifying the options of the interface within the HTML file
function modifyIterfaceOptions(enable_fix_spans=false, make_sortable=true, enable_sorting_between_categories=false) {
    enable_fix_spans = enable_fix_spans;
    make_sortable = make_sortable;
    enable_sorting_between_categories = enable_sorting_between_categories;
}

// For web demo, draw data from JSON file
function startupInterface(is_mturk=false, data_file='data/draft_input.json') {
    mturk = is_mturk;
    if (is_mturk) {
        $.ajax({
            url: 'https://davidheineman.github.io/edit-type-annotator/' + data_file,
            dataType: 'json',
        }).done(displayAnnotatorMturk);
    } else {
        $.ajax({
            url: data_file,
            dataType: 'json',
        }).done(displayAnnotatorWebDemo);        
    }
}

// Default options
var mturk = false;
var enable_fix_spans = false;
var make_sortable = true;
var enable_sorting_between_categories = false;

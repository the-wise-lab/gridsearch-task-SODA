// SAFE EXPLORATION TASK
// Coded poorly by Toby Wise
// Edited poorly by Kristin Witte


// Create important variables
var newBlock, outcome, outcomeText, outcomeOpen, score, boat, searchHistory, trialData, button;

// Initialize variable values
var scoreNumber = 0;
var startingSet = false;
var complete = false;
var nclicks = 10;
var currentBlock = 0;
var totalScore = 0;
var krakenFound = []
var data = {}
// Initialise some bonus round variables
var confidenceSliderMoved = false;
var estimateSliderMoved = false;
var bonusCollect = {"bonusStimuli":[], finalChosenCell:null};
var bonusCounter = 0
var totalBonusRounds = 5
var featureRange = 11
var randomStimuli
var bonusStimuli
var tile
var estimate

// initialise comprehension question variables

var score = 0
var comprehensionAttempts = 1
var understood = false

// initialise timing variables
var page1 = []
var page2= []
var page3 = []
var page4 = []
var page5 = []
var page6 = []
var time2
var time3
var time4
var time5
var time6 
var taskStart
var taskEnd

// Give these starting values so we can save data before the end without firebase complaining about undefined values
var totalTimeTask = 0;
var bonusPayment = 0;

var uid;
var db; // this will be the database reference
var docRef // this is the reference to the specific document within the database that we're saving to
var subjectID;
var studyID;



// Preload images
// https://stackoverflow.com/questions/3646036/preloading-images-with-javascript
function preloadImage(url)
{
    var img=new Image();
    img.src=url;
}

var img_urls = ["assets/clicked_squares.png", 
                "assets/nearby_squares.png", 
                "assets/fish_history.png", 
                "assets/kraken.svg", 
                "assets/kraken_found.png", 
                "assets/boat.svg",
                "assets/fish.svg"]

img_urls.forEach(i => preloadImage(i)); // KW: loops over img_urls and preloads everything

// This function puts everything in the 'data' object and saves it to firebase
function saveDataFirebase() {

  data["blocks"] = blocks;
  data["krakenFound"] = krakenFound;
  data["bonusPayment"] = bonusPayment*0.72;// transfer it into pounds before saving bc that is how it will be entered in prolific

  // Firebase doesn't supported nested arrays - it would be possible to rework this 
  // to save the data in a more firebase-friendly way, but just converting to a JSON
  // string is easier
  data["searchHistory"] = JSON.stringify(searchHistory);
  data["bonusRound"] = JSON.stringify(bonusCollect);

  
  data["page1RT"] = page1;
  data["page2RT"] = page2;
  data["page3RT"] = page3;
  data["page4RT"] = page4;
  data["page5RT"] = page5;
  data["page6RT"] = page6;
  data["taskRT"] = totalTimeTask;
  data["comprehensionAttempts"] = comprehensionAttempts;

  // Data can be saved to firebase as an object without needing to convert to a JSON string
  // docRef.update(data);

}


function getQueryVariable(variable)
{
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable){return pair[1];}
    }
    return(false);
}

// set up instructions
document.getElementById('consent').innerHTML = '';
document.getElementById('consent').style.margin = 0;
document.getElementById('consent').style.padding = 0;
document.getElementById('header_title').innerHTML = '';
document.getElementById('header_title').style.margin = 0;
document.getElementById('header_title').style.padding = 0;
var mainSection = document.getElementById('mainSection'); // KW: contains 'header_title', 'consent', 'header'
var header = document.getElementById('header');
mainSection.removeChild(header); // KW: irretrievably (?) removes header node which is a child of 'mainSection'
window.scrollTo(0, 0); // KW: go to top of page
      
// Task data etc
// Blocks - 0 = safe, 1 = risky
var blocks = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
blocks = shuffle(blocks);
blocks.splice(5,0,0) // insert a no-kraken round in the 6th round for the bonus round


// Scale  etc- unused but included for compatibility
var scale = Array(blocks.length).fill(100);
var scenario = 0;
var kernel = 0;
var horizon = 0;

// Environments - there are 30 potential environments, this shuffles them and then selects the first N, where N is the number of blocks (defined above)
var envOrder = [...Array(30).keys()];
envOrder = shuffle(envOrder);
envOrder = envOrder.slice(0, blocks.length + 1); //KW: +1 by extra block for bonus round

// what do we want to save?
// - for each block:total score, kraken present? (blocks var), kraken found?
// - once: bonus payment, bonus estimates (5), bonus confidence (5), which bonus tiles were highlighted (5), which one they chose, searchHistory

// This function sets up the grid etc
/* KW: input variables: 
number: number of rows/columns the grid should have, default = 11
size: the size of each tile of the grid, default = 10
numbergrid: true values underlying the grid
threshold: value at which the kraken appears, default = 50
training: only used during training, receives training_iteration variable
kraken: whether the kraken is present (if no, threshold = -1) (boolean)*/
var createGrid = function(number, size, numbergrid, threshold, training, kraken) {
    var krakenPresent = document.getElementById('krakenPresent');
    // KW: writes the kraken present/absent text above the grid
    if (kraken == 1) {
      krakenPresent.innerHTML = '<b>The kraken is nearby!</b>';
      krakenPresent.style.color = '#bf0000';
      ocean.setAttribute("style", "box-shadow: 0px 0px 40px #f00;");
    }
    
    else if (kraken == 0) {
      krakenPresent.innerHTML = '<b>The kraken is feeding elsewhere</b>';
      krakenPresent.style.color = 'black';
      ocean.setAttribute("style", "box-shadow: 0px 0px 0px #f00;");
    }
    
    // The grid is created as an svg object
    // KW: SVG is a vector graphics object so almost like a graphics programming language
    // KW: one can design svg objects either in JS or in HTML
    // KW: different SVG attributes: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
    var svg = document.createSvg("svg");
    svg.setAttribute("class","grid");
    svg.setAttribute("width", 400);
    svg.setAttribute("height", 400);
    svg.setAttribute('stroke-width', 0.2);
    svg.setAttribute("viewBox", [0, 0, number * size, number * size].join(" ")); 
    // KW: viewBox decides what part of the svg we actually see. [x, y, width, height]
    // (xy are relative to the svg not the entire window!!) decide where in svg we look
    // width and height can zoom in and out
    svg.setAttribute("clicked", false);

    var start_i;
    var start_j;

    // KW: looking for a random starting tile that is above 50 (loop until found it)
    while (startingSet == false) {
        var random_i = Math.floor(Math.random() * number); 
        var random_j = Math.floor(Math.random() * number); 
        if (numbergrid[random_i][random_j] > 50) {
            start_i = random_i;
            start_j = random_j;
            startingSet = true;
        }
    }

      for(var i = 0; i < number; i++) { // KW: loop through rows
        for(var j = 0; j < number; j++) { //KW: loop through columns (or other way around)

          var g = document.createSvg("g");
          g.setAttribute("transform", ["translate(", i*size, ",", j*size, ")"].join("")); // KW: moves over to the place where next tile should be
          g.setAttribute("stroke", "#ECF0F1");// KW: very bright shade of grey
          var elementId = number * i + j; //KW: give each tile its own ID (numbers from 0 to 120)
          var box = document.createSvg("rect"); // KW: draws a box of the size that each tile should have

          // Array of fish number recorded in this square
          box.nFishHistory = [];

          box.setAttribute("width", size);
          box.setAttribute("height", size);
          box.setAttribute("fill", "white");
          box.setAttribute("fill-opacity", 0.1);
          box.setAttribute("stroke-opacity", 0.1);
          box.setAttribute("id", "square-" + elementId); // KW: give tile a number between 0 and 120
          box.xpos = i; //KW: position the box on grid
          box.ypos = j;
          

          // Text to show number of fish in this square

          var text = document.createSvg("text");
          text.nfish = numbergrid[i][j]; //KW: get the text that should be in that position
          text.setAttribute('x', size / 2); // KW: to position it in the middle of the tile
          text.setAttribute('y', size / 2);
          text.setAttribute('font-size', '30%');
          text.setAttribute('fill', 'white');
          text.setAttribute('fill-opacity', 0.7);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('font-family', 'Cabin');
          text.setAttribute('stroke-opacity', 0);
          text.textContent = '';
          
          // KW: for the start square fill in the information and make the background a little brighter
          if (i == start_i & j == start_j) {
            box.setAttribute("fill",'white');
            box.setAttribute("fill-opacity", 0.3);
            box.setAttribute("data-click",1);
            if (box.nFishHistory !== undefined){
              box.nFishHistory.push(text.nfish);
            } else {
              box.nFishHistory = [];
              box.nFishHistory.push(text.nfish);
            }  
            
            text.textContent = text.nfish;

            // KW: save the number if fish "caught" at start and where they were
            if (understood) {
              trialData.zcollect.push(text.nfish);
              trialData.xcollect.push(start_i);
              trialData.ycollect.push(start_j);
            }


          }
          // KW: adding the text in each tile, the box where the text goes and the little boat (externally created) as child nodes of the tile
          g.appendChild(text);
          g.appendChild(box);
          g.appendChild(boat);
          svg.appendChild(g); // KW: adding the tile svg to the whole grid


        }  // KW: repeat for each tile

    }
    

    svg.addEventListener(
     
          // What to do when the grid is clicked 
    // KW: overview of different Events that could be used and what they mean: https://www.w3schools.com/jsref/dom_obj_event.asp 
      "click",
      function(e){ // KW: e is the MouseEvent that gives infos on the button click
        
        if (outcomeOpen == false & training_clickable == true) { //KW: (unsure) outcomeOpen: total win of trial not yet decided (can still click), training_clickable: can click
          
          var targetElement = e.target; //KW: element that was clicked (the tile svg I guess)
            // if(targetElement.getAttribute("data-click") != null)
            //     return;
            targetElement.setAttribute("fill",'white');// KW: makes the clicked tile become whiter
            targetElement.setAttribute("fill-opacity", 0.3);
            targetElement.setAttribute("data-click",1);  

            // gaussian noise
            var noiseGenerator = Prob.normal(0, 1.0);
            var noise = Math.round(noiseGenerator());

            // Add noise
            var nFishThisTrial = targetElement.parentElement.firstElementChild.nfish + noise;

            // Deal with bad noise --> make sure nFish can never be more than 100 or less than 0
            if (nFishThisTrial > 100) {
              nFishThisTrial = 100;
            }
            if (nFishThisTrial < 0) {
              nFishThisTrial = 0;
            }
            
            // Data --> save the number of fish "found" in the first square
            if (understood) {
              trialData.zcollect.push(nFishThisTrial);
              trialData.xcollect.push(targetElement.xpos);
              trialData.ycollect.push(targetElement.ypos);
            }

            
            // Training stuff
            if (training_iteration >= 0) {
              if (training_iteration == 0) { // KW: after the first click of the training the grid becomes white, one can't click anymore but has to click the arrow
                training_clickable = false;
                window.setTimeout(function() {
                  document.getElementById("ocean").style.opacity = "40%";
                }, 1500)
                arrow.disabled = false;
                arrow.style.opacity = 1;
              }

              training_clicks += 1;
              if (training_clicks > 5 & training_iteration == 3) { //KW: after the 5th training click I ALWAYS find 39 fish thus kraken
                nFishThisTrial = 39;
              }
              else if (nFishThisTrial <= 50 & training_iteration <= 3) { //KW: makes sure I don't find the kraken before 6th click
 
                nFishThisTrial = 55;
              }
            }

            // Calculate fish and add to array
            targetElement.parentElement.firstElementChild.textContent = nFishThisTrial; // KW: retrieve fish in clicked tile
            if (box.nFishHistory !== undefined){
              targetElement.nFishHistory.push(nFishThisTrial);// KW: save them in fish history of that tile
            } else {
              box.nFishHistory = [];
              targetElement.nFishHistory.push(nFishThisTrial);// KW: save them in fish history of that tile
            } 

            svg.setAttribute("clicked", true);

            // IF FISH ARE CAUGHT
            if (nFishThisTrial > threshold) {
                outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'You caught ' + nFishThisTrial + ' fish!';
                outcome.getElementsByClassName("textcontainer").textcontainer.innerHTML += '<br><br><img src="assets/fish.svg" width=100%>'
                scoreNumber += nFishThisTrial;
                nclicks -= 1;
                score.innerHTML = "Score this block: " + scoreNumber + "<br>Clicks left: " + nclicks + "<br><font color='#9c9c9c'>Total score: " + totalScore + "</font>";
                if (nclicks > 0) { //KW: outcome box go away after 1s
                    setTimeout(function() {
                      outcome.style.display = "none";
                      boat.style.display = "none";
                      outcomeOpen = false;
                  }, 1000)
                }
                else {
                  complete = true;
                  
                  searchHistory.xcollect.push(trialData.xcollect);
                  searchHistory.ycollect.push(trialData.ycollect);
                  searchHistory.zcollect.push(trialData.zcollect);

                  krakenFound.push(0)
                  
                  // !! SAVE DATA HERE !! //
                  // Variables to save:
                  //JSON.stringify(searchHistory)
                  // totalScore
                  saveDataFirebase(); 
                  
                  setTimeout(function() { //KW: say end of block and create continue button after 1.5s
                    outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'End of block!';
                    outcome.getElementsByClassName("textcontainer").textcontainer.appendChild(button);
                  }, 1500)
                }
                
            }

            // IF THE KRAKEN IS FOUND
            else {
                outcome.getElementsByClassName("textcontainer").textcontainer.textContent = nFishThisTrial + ' fish! You found the Kraken!';
                outcome.getElementsByClassName("textcontainer").textcontainer.innerHTML += '<br><br><img src="assets/kraken.svg" width=40%>'

                // If this is a training trial, allow subject to move on
                if (training_iteration == 3) {
                  training_caught = true;
                  arrow.style.opacity = 1;
                  button.setAttribute("class", "submit_button")
                }

                else {
                  searchHistory.xcollect.push(trialData.xcollect);
                  searchHistory.ycollect.push(trialData.ycollect);
                  searchHistory.zcollect.push(trialData.zcollect);
                  krakenFound.push(1)
                }

                // Score decreasing to zero
                var scoreInterval = setInterval(function() {
                  scoreNumber -= 1;//KW: score decreases by 1 every 20ms
                  if (scoreNumber < 0) {
                    scoreNumber = 0;
                  }
                  score.innerHTML = "<font color='#bf0000'>Score this block: " + scoreNumber + "</font><br>Clicks left: " + nclicks + 
                  "<br><font color='#9c9c9c'>Total score: " + totalScore + "</font>";
                  if (scoreNumber == 0) {
                    clearInterval(scoreInterval);
                    complete = true;

                    // !! SAVE DATA HERE !! //
                    // Variables to save:
                    // JSON.stringify(searchHistory)
                    // totalScore
                    saveDataFirebase(); 

                    setTimeout(function() {

                      if (currentBlock == 1) { // if this was the instructions then make the continue button better visible
                        $(ocean).hide()
                        $(krakenPresent).hide()
                      } else {
                        outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'You found the Kraken!';
                        outcome.getElementsByClassName("textcontainer").textcontainer.appendChild(button);
                      }
                    }, 1500)
                    // outcome.getElementsByClassName("textcontainer").textcontainer.innerHTML = ''
                  }
                }, 10) // KW: repeat this function every 10ms until the score is at 0 in which case display the continue button (originally 20 but I found a bit slow if many points)

            }
            // KW: end of the "when clicked" function
            // KW: position and size the outcome box (score,etc) and the little boat that moves around on the grid
            outcome.style.display = "flex";
            boat.style.display = "block";
            boat.style.width = (400 / number) + 'px';
            boat.style.height = (400 / number) + 'px';
            boat.getElementsByClassName("boatImg")[0].style.width = (400 / number) + 'px';
            boat.style.top = targetElement.ypos * (400 / number) + "px";
            boat.style.left = targetElement.xpos * (400 / number) + "px";
            outcomeOpen = true;
            
        }

      },
      // KW: end of the event listener for the click
    false); //KW: false = bubbling propagaion but irrelevant in this case
  
    // This shows previous numbers of fish caught when hovering the mouse over a square on the grid
    svg.addEventListener(
    	"mouseover",
      function(e){
      	var targetElement = e.target;

        // Fish history hover box
        fishHistory.style.left = targetElement.xpos * 50 + "px";
        fishHistory.style.top = targetElement.ypos * 50 + "px";

        if (targetElement.nFishHistory !== undefined){

        if (targetElement.nFishHistory.length) { //KW: if there are fish in history then display history otherwise disp not fished here before
          fishHistory.innerHTML = targetElement.nFishHistory;
        }
        else {
          fishHistory.innerHTML = "You haven't fished here before";
        }
      } else{
        targetElement.nFishHistory = [];
        fishHistory.innerHTML = "You haven't fished here before";
      }
        //KW: delay for fish history to appear
        var historyAppear = setTimeout(function() {
          fishHistory.style.opacity = 1;
        }, 1000); //KW: I found it a bit confusing that it takes 2.5s for the box to appear (felt like program lagging) so now only 1s


        // KW: make it more white if has been clicked than if hasn't
        if(targetElement.getAttribute("data-click") != null) {
          targetElement.setAttribute("fill-opacity", 0.5)
        }
        else {
          targetElement.setAttribute("fill-opacity", 0.2);
        }
			}
    );
  // })
    // KW: what happens when mouse is no longer over the tile
    svg.addEventListener(
			"mouseout",
      function(e){
        var targetElement = e.target;
        fishHistory.style.opacity = 0; // stop showing the fish history
      	if(targetElement.getAttribute("data-click") != null) { // KW: if target was clicked in the process then make sure it stays highlighted
          targetElement.setAttribute("fill-opacity", 0.3)
        }
        else {
          targetElement.setAttribute("fill-opacity", 0.1);
        }
        
      }
		);
  return svg;
};



// OK button
function createOkButton(){
button = document.createElement("button");
button.setAttribute("class", "button");
button.setAttribute("id", "ok")
button.innerHTML = 'Continue';
button.onclick = function() {
  if (training_done) {

    outcome.style.display = "none";
    boat.style.display = "none";
    outcomeOpen = false;
    document.getElementById("ocean").innerHTML = "";
    totalScore += scoreNumber;  // Add to total score
    scoreNumber = 0; // KW: reset score etc.
    startingSet = false;
    complete = false;
    nclicks = 10;
    score.innerHTML = "Score this block: " + scoreNumber + "<br>Clicks left: " + nclicks + "<br><font color='#9c9c9c'>Total score: " + totalScore + "</font>";
    score.style.color = 'black';
    // close instructions if open and bring back the ocean and the kraken and the button style button
    if (instructionsOpen) {
      instructionContent.innerHTML = '';
      instructionHeading.innerHTML = '';
      instructionContainer.style.height = '15px';
      instructionContainer.style.minHeight = '15px';

      // $(ocean).show()
      // $(krakenPresent).show()
      // button.setAttribute("class", "button");



      
    } 
    
    if (currentBlock -1 < blocks.length) { //KW: if still has blocks to go, empty trial data arrays and run the task again (-2 bc 1 block for intro and 1 for bonus)
      if (understood){
        trialData = {xcollect: [],
        ycollect: [],
        zcollect: []
        }
        if (currentBlock == 6){
          runBonus(grids[envOrder[currentBlock - 1]], 50)
        } else {
        runTask(grids[envOrder[currentBlock - 1]], 50, blocks[currentBlock - 1]);  // current block starts from 1, 0 is training
        }
      } else{
       // disp comprehension questions
        startComprehension()
        page6[comprehensionAttempts -1] = (Number(new Date()) - time6)/60000
       
      }
     
    }
    else { //KW: if this was the last block
      var container = document.getElementById("ocean");
      var endButton = document.createElement("endButton");
      endButton.setAttribute("class", "button");
      // this makes the end button take us to the final questionnaires
      endButton.innerHTML = 'continue to final questionnaires';

      endButton.onclick = function(){
        window.location.href = "questionnairesPost.html?" + "PROLIFIC_PID=" + subjectID + '&UID=' + uid + '&STUDY=' + studyID;  // This passes the subjectID, Firebase UID, and Study ID to the next page
      }
  
      container.appendChild(newBlock);

      bonusPayment = totalScore * 0.0007
      taskEnd = Number(new Date());
      totalTimeTask = (taskEnd - taskStart)/60000

      // !! SAVE DATA HERE !! //
      saveDataFirebase(); 

// what do we want to save?
// - for each block: kraken present? (blocks var), kraken found?
// - once: bonus payment, bonus estimates (5), bonus confidence (5), which bonus tiles were highlighted (5), searchHistory

      newBlock.style.fontSize = '20px';

      newBlock.innerHTML = 'End of task!<br><br>You caught ' + totalScore + ' fish, and won $' + bonusPayment.toFixed(2) + '!'
      newBlock.style.opacity = 1;
      endButton.style.fontSize = "30px";
      newBlock.appendChild(endButton);
    }
  }
}
}

createOkButton()

// This sets up the training section
var training_iteration = 0;
var training_clicks = 0;

var krakenPresent = document.getElementById('krakenPresent');
krakenPresent.style.visibility = 'hidden';

// History hover box
var fishHistory = document.createElement('div');
fishHistory.setAttribute("class", "hoverBox");
fishHistory.innerHTML = '23, 45, 92'; // KW: why these numbers????
fishHistory.style.opacity = 0;

function runTraining(numbergrid, training_iteration) {
    // The overall container thing
    
    newBlock.style.opacity = 0.65;// I feel like this is kinda unnecessary. the training hasn't even started yet
    var container = document.getElementById("ocean");
    var oceanGrid = createGrid(11, 10, numbergrid, 50, training_iteration, true)
    ocean.setAttribute("style", "box-shadow: 0px 0px 0px #f00;");
    container.appendChild(oceanGrid);
    container.appendChild(outcome);
    container.appendChild(score);
    container.appendChild(boat);
    container.appendChild(newBlock);
    oceanGrid.clicked = false;
    arrow.style.opacity = 0.1;
    arrow.disabled = true;

    container.appendChild(fishHistory);

    setTimeout(function () { //KW: makes the text "next block" be displayed on the grid for 1s then disappear.
      newBlock.style.opacity = 0;
    }, 1000)
    setTimeout(function () { //KW: this removes the next block announcement box. Why was it really here in the first place?
      container.removeChild(newBlock);
      }, 2000)
      currentBlock +=1;
    // refreshCount();
}


// This runs the task
function runTask(numbergrid, threshold, kraken) {
    // get rid of the headline that says "Welcome to the game. Follow the instructions etc."
    document.getElementById("instructions").innerHTML = "<br/><br/>"
    newBlock.style.opacity = 0.65;//KW: here it makes sense
    var container = document.getElementById("ocean");

    // Threshold for game ending - if risky this is 50, otherwise -1 
    if (kraken == 1) {
      threshold = 50;
    }
    else {
      threshold = -1;
    }

    container.appendChild(createGrid(11, 10, numbergrid, threshold, false, kraken));
    //KW: false refers to training_iteration variable
    //KW: 11 = number (of rows/columns), 10 = size (of each tile)
    container.appendChild(outcome);
    container.appendChild(score);
    container.appendChild(boat);
    container.appendChild(newBlock);

    container.appendChild(fishHistory);

    setTimeout(function () {
     newBlock.style.opacity = 0; //KW: "next block" alert goes away after 1s
    }, 1000)
    setTimeout(function () {
      container.removeChild(newBlock); //KW: for some reason actually need to remove the node that says next block
     }, 2000)
     currentBlock +=1;
    // refreshCount();
}

// Training things
var grids;
var training_clickable = true;
var training_done = false;
var training_caught = false;
var instructionsOpen = true;

var fullurl = window.location.href;

// comprehension questions -----------------------------
function createQuestion(questionnaireName, questionData) { // function from Toby's questionnaire code
  // This function creates an individual item

  var f = document.createElement("form");
  f.setAttribute('method',"post");
  f.setAttribute('action',"submit.php");
  f.setAttribute('id', questionnaireName.concat('_' + questionData.qNumber.toString()));
  f.setAttribute("name", "form_");

  var fieldset = document.createElement("fieldset");
  fieldset.setAttribute("class", "form__options");
  fieldset.setAttribute('id', questionnaireName.concat('_' + questionData.qNumber.toString()));
  fieldset.setAttribute("name", "fs_");

  var legend = document.createElement("legend");
  legend.setAttribute("class", "form__question");
  legend.setAttribute("name", "legend");
  legend.append(questionData.prompt);

  fieldset.appendChild(legend);

  var labels = [];
  var i
  for (i = 0; i < questionData.labels.length; i++) {

      var p = document.createElement("p");
      p.setAttribute('class', 'form__answer');
      var c = document.createElement("input");
      c.type = "radio";
      c.id = questionnaireName.concat(questionData.qNumber.toString()).concat("answer".concat(i.toString()));
      c.name = "question";
      c.value = i;

      var l = document.createElement("label");
      l.setAttribute('for', c.id);
      l.append(questionData.labels[i]);

      p.appendChild(c);
      p.appendChild(l);

      labels.push(p);

      fieldset.appendChild(p)

  }

  f.appendChild(fieldset);


  return f;

}

var createComprehension = function(){
var q1Data = {
  qNumber: 0,
  prompt: "What is the aim of this game?",
  labels: ['To find the kraken.', 'To click on every square at least once.', 'To catch as many fish as possible.']
};
var q2Data = {
  qNumber: 1,
  prompt: "What happens when you click the same square several times?",
  labels: ['You will get approximately the same number of fish (+-2).', 'The number of fish you get will gradually decrease.', 'You will only get fish the first time, afterwards the fish in that square are gone.']
};

var q3Data = {
  qNumber: 2,
  prompt: "How do you know how many fish to expect in one location?",
  labels: ['There is no way to know.', 'The lower half of the ocean has more fish.', 'The number of fish in adjacent tiles is similar.']
};

var q4Data = {
  qNumber: 3,
  prompt: "What happens when you find the kraken?",
  labels: ['It is the end of the experiment.', 'The round is over and you lose all the fish you collected in that round.', 'You get extra points']
};

var q5Data = {
  qNumber: 4,
  prompt: "When can you expect to find the kraken?",
  labels: ['When you click a square with less than 50 fish.', 'At any moment, you have no control over this.', 'When you click a square with less than 50 fish on a round where it is written that the kraken is nearby over the ocean.']
};

var q6Data = {
  qNumber: 5,
  prompt: "Does the number of fish in each square change from one block to the next?",
  labels: ['No, each block is about the same ocean.', 'Yes, each block is a completely new ocean.', 'The oceans only change a little bit between blocks.']
};

var Q1 = createQuestion('Q1', q1Data);
var Q2 = createQuestion('Q2', q2Data);
var Q3 = createQuestion('Q3', q3Data);
var Q4 = createQuestion('Q4', q4Data);
var Q5 = createQuestion('Q5', q5Data);
var Q6 = createQuestion('Q6', q6Data);
document.getElementById('quiz').appendChild(Q1);
document.getElementById('quiz').appendChild(Q2);
document.getElementById('quiz').appendChild(Q3);
document.getElementById('quiz').appendChild(Q4);
document.getElementById('quiz').appendChild(Q5);
document.getElementById('quiz').appendChild(Q6);

  // create submit buton
  var submit = document.getElementById("submitComp")
  $(submit).show()
  $(document.getElementById("submitContainer")).show()
  submit.addEventListener("mouseup", checkComprehension)
  // document.getElementById('quizContainer').appendChild(submit)

}


// when submitting comprehension questions

function checkComprehension(){


  var inputs = document.getElementsByName("fs_");

    // Loop through the items nad get their values
  var values = {};
  var incomplete = [];
  var i
    for (i = 0; i < inputs.length; i++) {

        if (inputs[i].id.length > 0) {
            var id
            // Get responses to questionnaire items
            id = inputs[i].id;
            var legend = inputs[i].querySelectorAll('[name="legend"]')[0];

            var checked = inputs[i].querySelector('input[name="question"]:checked');

            if (checked != null) {
                legend.style.color = "#000000";
               var value = checked.value;
                values[id] = value;
            }else {
                legend.style.color = "#ff0000";
                incomplete.push(id);
            }
        }
          
    }
      
    
    // This checks for any items that were missed and scrolls to them
    if (incomplete.length > 0) {

        $('html, body').animate({ // go to first missed items
                scrollTop: $(document.getElementById(incomplete[0])).offset().top - 100
                }, 400);
       

        if(incomplete.length > 1){ // if you missed more than one item
           
            for (i = 0; i < incomplete.length -1; i++){ // loops through all missed questions and attaches an event listener to each of them
            
            $(document.getElementById(incomplete[i])).children().click(function (e) { 
                var target = e.target.parentElement.parentElement.parentElement.id // name of the given question
                var n = incomplete.indexOf(target)// I can't simply use i as the index as it is already done with the loop by the time one clicks
                var nextMiss = document.getElementById(incomplete[n+1])
                $('html, body').animate({ // go to next question
                scrollTop: $(nextMiss).offset().top - 100
                }, 400);
            });

            }
        }

        

        
    } else if (values["Q1_0"] == "2" && values["Q2_1"] == "0" && values["Q3_2"] == "2" && values["Q4_3"] == "1" && values["Q5_4"] == "2" && values["Q6_5"] == "1") {
      understood = true
      // close instruction stuff
      instructionContent.innerHTML = '';
      instructionHeading.innerHTML = '';
      instructionContainer.style.height = '15px';
      instructionContainer.style.minHeight = '15px';
      instructionsOpen = false
      training_done = true

      // get everything ready to start the task
      createOkButton()
      var okButton = document.getElementById("ok")
      okButton.setAttribute("class", "button");
      $(document.getElementById("quizContainer")).hide()
      $(document.getElementById("quiz")).hide()
      $(document.getElementById("submitContainer")).hide()
      $(document.getElementById("submitComp")).hide()

      runTask(grids[envOrder[currentBlock - 1]], 50, blocks[currentBlock - 1]);
      $(document.getElementById("krakenPresent")).show()
      window.scrollTo(0,0);
      taskStart = Number(new Date());
    } else {

      comprehensionAttempts +=1
      // set everything to beginning
      var ocean = document.getElementById("ocean")
      $(ocean).remove() // int() creates a new one
      document.getElementById("credit").remove()// same here
      training_iteration = 0
      currentBlock = 0
      training_clickable = true;
      training_done = false;
      training_caught = false;
      instructionsOpen = true;
      training_clicks = 0;
      
      init()
      
      $(document.getElementById("quizContainer")).hide()
      $(document.getElementById("quiz")).hide()
      $(document.getElementById("submitContainer")).hide()
      $(document.getElementById("submitComp")).hide()
      window.scrollTo(0, 0);

      // create button again bc it was removed with the ocean
      createOkButton()
    }

}



function startComprehension(){
  // hide stuff
  $(document.getElementById("ocean")).hide()
  $(document.getElementById("ok")).hide()
  $(document.getElementById("credit")).hide()
  // show instruction stuff (as headline) and the quiz
  var instructionHeading = document.getElementById("instructionHeading")
  $(instructionHeading).show()
  instructionHeading.innerHTML = "<h2>Please answer some questions to see whether you understood everything correctly.</h2>";
  $(document.getElementById("quizContainer")).show()
  $(document.getElementById("quiz")).show()
  if (comprehensionAttempts == 1){ // if this is the first attempt, create the questions
    createComprehension()
  } else { // if it isnt, no need to create them but do need to show the button that was previously hidden
    $(document.getElementById("submitContainer")).show()
    $(document.getElementById("submitComp")).show()
  }
 window.scrollTo(0, 0);


   
}


// ---------------------

// This function runs when the task is started

var init = function() {

  // GET URL VARIABLES
  // Get Prolific ID 
    if (window.location.search.indexOf('PROLIFIC_PID') > -1) {
      subjectID = getQueryVariable('PROLIFIC_PID');
  }

  // STUDY ID
  if (window.location.search.indexOf('STUDY') > -1) {
      studyID = getQueryVariable('STUDY');
  }
  studyID = 'data';
  // Get Firebase UID
    if (window.location.search.indexOf('UID') > -1) {
      uid = getQueryVariable('UID');
  }

  // Get firebase database reference
//  db = firebase.firestore();
//  docRef = db.collection("safe_exploration").doc(studyID).collection('subjects').doc(uid);

  var start = Number(new Date());
  var mainSection = document.getElementById('mainSection');//KW: whole page
  var ocean = document.createElement('div');
  ocean.setAttribute('class', 'ocean');// KW: define in the CSS file just like most classes and stuff
  ocean.setAttribute('id', 'ocean');
  mainSection.appendChild(ocean)

  var credit = document.createElement('div');
  credit.setAttribute('id', 'credit');
  credit.setAttribute('class', 'credit');
  credit.innerHTML = '<a href="http://www.freepik.com">Images designed by macrovector / Freepik</a>'
  mainSection.appendChild(credit);

  // Instructions
  var instructions = document.getElementById("instructions");

  // X, Y, Z --> KW: create empty arrays for search history
  searchHistory = {xcollect: [], 
    ycollect: [], 
    zcollect: []
  };

  // Data for each trial 
  trialData = {xcollect: [],
    ycollect: [],
    zcollect: []
  }

  // Instructions
  var instructionsArray = [];

  instructionsArray.push(
  "You can choose to go fishing in any of the squares of the grid shown over the ocean. Once you click on a square, you will be shown " +
  "the number of fish you caught in that square." + 
  '<br><br><img src="assets/clicked_squares.png">' +
  "<br><br>One square will be selected for you when you begin, and you'll see the number of fish in that square." + 
  "<br><br><b>Try clicking on a square</b>");

  instructionsArray.push("You will have to work out which locations are likely to contain the most fish in order to maximise your score.<br><br>" + 
  "If one square has a high number of fish, it's likely that nearby squares will also have a lot of fish. If a square has few fish, " +
  "nearby squares are likely to also have few fish.<br><br>" + 
  '<img src="assets/nearby_squares.png"><br><br>' +
  "You can click on a square more than once - each time you will get a similar result. " + 
  "If you hover your mouse over a square, you will see how many fish you caught there previously." + 
  '<br><br><img src="assets/fish_history.png">');

  instructionsArray.push("<h3>HOWEVER...</h3>" + 
  "There is a dangerous creature called the <font color='#bf0000'><i>Kraken</i></font> lurking in the ocean somewhere, which feeds on fish." + 
  '<br><br><img src="assets/kraken.svg" height=80>' + 
  "<br><br>You <b>must</b> avoid finding the Kraken. If you do, it will steal all the fish you have collected in that round!<br><br>" + 
  "When the kraken is nearby, there will be a warning above the ocean. Sometimes the kraken will be somewhere else, and you won't be at risk of finding it.");

  instructionsArray.push("Areas where the Kraken lurks will have very few fish as it has started to eat them.<br><br>"  +
  '<img src="assets/kraken_found.png"  height=200>' +
  "<br><br>When the kraken is nearby, if you find a square with 50 fish or fewer, there is a <font color='#bf0000'><b>100% chance</b></font> that the Kraken will be there. " +
  "<br><br>If you find a square with more than 50 fish, you'll <b>always</b> be safe.<br><br>The number of fish in the ocean <b>does not decrease<b> as the task goes on, or when you click on a square more than once.<br><br>" + 
  "<b>Try fishing, and see if you find the kraken</b>")

  instructionsArray.push("You may have just found the kraken in a place where you didn't expect it - for this example we gave you a low number of fish after 5 clicks, no matter where you clicked. " + 
  "In the real game, nearby places in the sea will have similar numbers of fish.<br><br>" )

  
  instructionsArray.push("Half-way through the game there will be a <strong>bonus round</strong>.<br/>That means that after a few clicks, 5 random location will turn red one after the other and you will be asked </br> " +
  "for each of them how many fish you think are hidden in that location and how confident you are in your judgement.<br/>There will be sliders appearing under the grid for you to indicate your judgement.<br/>" +
  '<img src = "assets/bonusRoundJudgement.PNG"><br/>'+ 
  "After making your judgement about all 5 locations, you will be asked to pick one of the 5 locations to fish from and then continue fishing as usual. <br/>" + 
  "We will make sure that the kraken is not around during the bonus round.<br/>"+
  '<img src = "assets/bonusRoundChoice.PNG"><br/>' + 
  "There will be " + blocks.length + " blocks, and you get 10 clicks within each block.<br><br>" + 
  "To make this a little more fun, you will receive a bonus payment that is dependent on how many points you collect. You will receive an extra £0.03 for every 100 points, up to a maximum of £3.<br><br>" +
  "<b>Click continue below to start!</b>")

  var instructionContainer = document.createElement("instructionContainer");
  instructionContainer.setAttribute("id", "instructionContainer");

  var instructionHeading = document.createElement("instructionHeading");
  instructionHeading.innerHTML = "Instructions";
  instructionHeading.setAttribute("id", "instructionHeading");
  instructionContainer.appendChild(instructionHeading);

  var instructionContent = document.createElement("instructionContent");
  instructionContent.setAttribute("id", "instructionContent");
  instructionContainer.appendChild(instructionContent);

  var instructionText = document.createElement("instructionText");
  instructionText.setAttribute("id", "instructionText");
  instructionText.innerHTML = instructionsArray[0]; //KW: first instructions
 
  // KW: create arrow to continue
  var arrow = document.createElement("button");
  arrow.setAttribute("id", "arrow");
  arrow.innerHTML = "Click to continue<br><br>";
  var arrowImg = document.createElement("arrowImg");
  arrowImg.innerHTML = "<img src='assets/arrow.png'>";
  arrowImg.setAttribute("id", "arrowImg");
  arrow.appendChild(arrowImg);

  arrow.addEventListener("mouseup", function() {

    // First instructions & try clicking
    if (training_iteration == 0) {
      time2 = Number(new Date())
      page1[comprehensionAttempts - 1] = (time2 - start)/60000;
      training_clickable = false;
      instructionText.classList.add("fade");//KW: adds the class "fade" (defined in task.css) to make it fade in
      instructionText.innerHTML = instructionsArray[1];
      setTimeout(function(){
        instructionText.classList.toggle("fade");// KW: removes the fade class and returns "false"
        training_iteration = 1;
      }, 500);
    }

    // KW: I feel like the fade isn't actually happening. Commenting it out didn't do anything.
    
    // How to score high
    if (training_iteration == 1) {
      time3 = Number(new Date())
      page2[comprehensionAttempts - 1] = (time3 - time2)/60000;
      var krakenPresent = document.getElementById('krakenPresent');
      ocean.setAttribute("style", "box-shadow: 0px 0px 40px #f00;");
      krakenPresent.style.visibility = 'visible';
      instructionText.classList.add("fade");
      instructionText.innerHTML = instructionsArray[2];
      setTimeout(function(){
        instructionText.classList.toggle("fade");
        training_iteration = 2;
      }, 500);
    }

    // Kraken
    if (training_iteration == 2) {
      time4 = Number(new Date())
      page3[comprehensionAttempts - 1] = (time4 - time3)/60000;
      training_clickable = true;
      document.getElementById("ocean").style.opacity = "100%"
      instructionText.classList.add("fade");
      instructionText.innerHTML = instructionsArray[3];
      setTimeout(function(){
        instructionText.classList.toggle("fade");
        training_iteration = 3;
        arrow.style.opacity = 0.1;
      }, 500);
    }

    // Try to find the kraken
    if (training_iteration == 3 & training_caught == true) {
      time5 = Number(new Date())
      page4[comprehensionAttempts - 1] = (time5 - time4)/60000;
      training_clickable = false;
      instructionText.classList.add("fade");
      instructionText.innerHTML = instructionsArray[4];
      setTimeout(function(){
        training_iteration = 5;
        arrow.style.opacity = 1;
        instructionText.classList.toggle("fade");
      }, 500);
    }

    // info on Bonus round
    if (training_iteration == 5) {
      time6 = Number(new Date())
      page5[comprehensionAttempts - 1] = (time6 - time5)/60000;
      training_clickable = true
      instructionText.classList.add("fade");
      instructionText.innerHTML = instructionsArray[5];
      $(document.getElementById("ocean")).hide()
      $(document.getElementById("krakenPresent")).hide()
      document.getElementById("instructions").appendChild(button)
     
      setTimeout(function(){
        training_iteration = 6;
        arrow.style.opacity = 0;
        instructionText.classList.toggle("fade");
        training_done = true;
        searchHistory = {xcollect: [], 
          ycollect: [], 
          zcollect: []
        };
      }, 500);
    }
    });
  if (comprehensionAttempts == 1) {
  instructions.innerHTML = "<h1>Welcome to the game!</h1>" + 
  "<h2>In this game you play the role of a sailor trying to catch fish from the ocean. " + 
  "Follow the instructions below to learn how to play</h2><br>";
  } else {
  instructions.innerHTML = 
  "<h2><font color = 'red'>You answered one or more comprehension question incorrectly. Please read the instructions again to make sure you understood everything.</font></h2><br>";
  }
  
  instructionContent.appendChild(instructionText);
  instructionContent.appendChild(arrow);

  instructions.appendChild(instructionContainer);

// KW: create the function that lets you create an SVG w/o always entering that url (used to create basics of the grid)
  document.createSvg = function(tagName) {
      var svgNS = "http://www.w3.org/2000/svg";
      return this.createElementNS(svgNS, tagName);
  };

  // New block warning
  newBlock = document.createElement("div");
  newBlock.setAttribute("class", 'warning');
  newBlock.innerHTML = "Next block";

  // Outcome div (how many fish)
  outcome = document.createElement("div");
  outcome.setAttribute("class", "outcome");
  outcome.setAttribute("id", "outcome");

  // Text to show how many fish
  outcomeText = document.createElement("div");
  outcomeText.setAttribute("class", "textcontainer")
  outcomeText.setAttribute("id", "textcontainer")
  outcomeText.textContent = "You caught 10 fish!";
  outcomeText.innerHTML += '<img src="assets/boat.svg">'

  // Append text to the outcome box
  outcome.appendChild(outcomeText);
  // outcome.appendChild(button);
  outcome.style.display = "none";
  outcome.style.zIndex = 1000;
  outcomeOpen = false;

  // Show score at the bottom of the screen
  score = document.createElement("div");
  score.setAttribute("class", "score");
  score.innerHTML = "Score this block: " + scoreNumber + "<br>Clicks left: " + nclicks + "<br><font color='#9c9c9c'>Total score: " + totalScore + "</font>";
  score.style.fontFamily = 'Cabin';

  // A boat
  boat = document.createElement("div");
  boat.setAttribute("class", "boat")
  boat.setAttribute("id", "boat")
  boat.style.display = "none";
  boat.innerHTML = '<img class="boatImg" src="assets/boat.svg">'

  // Load grid info and start task
  $.getJSON('assets/sample_grid.json').success(function(data) {
    grids = data;
  }).then(function() {
    if (currentBlock == 0) {
      runTraining(grids[currentBlock], 0);
      //runBonus(grids[currentBlock], 0)
    }
   
  });
}

// init()
// Function used for shuffling things
// https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
function shuffle(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}

//Create normal noise distribution
function myNorm() {
  var x1, x2, rad, c;
   do {
      x1 = 2 * Math.random() - 1;
      x2 = 2 * Math.random() - 1;
      rad = x1 * x1 + x2 * x2;
  } while(rad >= 1 || rad == 0);
   c = Math.sqrt(-2 * Math.log(rad) / rad);
   return (x1 * c);
};


//random number generator
function randomNum(min, max){
  return Math.floor(Math.random() * (max-min+1)+min)
}


// BONUS ROUND CODE ----------------------------------------------

var createBonusGrid = function(number, size, numbergrid) {
  krakenFound.push(0)
  var krakenPresent = document.getElementById('krakenPresent');
  // KW: writes the kraken present/absent text above the grid
  krakenPresent.style.visibility = "visible"
  krakenPresent.innerHTML = '<b>The kraken is feeding elsewhere.</b>';
  krakenPresent.style.color = 'black';
  ocean.setAttribute("style", "box-shadow: 0px 0px 0px #f00;");

  // The grid is created as an svg object
  // KW: SVG is a vector graphics object so almost like a graphics programming language
  // KW: one can design svg objects either in JS or in HTML
  // KW: different SVG attributes: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute
  var svg = document.createSvg("svg");
  svg.setAttribute("class","grid");
  svg.setAttribute("width", 400);
  svg.setAttribute("height", 400);
  svg.setAttribute('stroke-width', 0.2);
  svg.setAttribute("viewBox", [0, 0, number * size, number * size].join(" ")); 
  // KW: viewBox decides what part of the svg we actually see. [x, y, width, height]
  // (xy are relative to the svg not the entire window!!) decide where in svg we look
  // width and height can zoom in and out
  svg.setAttribute("clicked", false);

  var start_i;
  var start_j;

  // KW: looking for a random starting tile that is above 50 (loop until found it)
  while (startingSet == false) {
      var random_i = Math.floor(Math.random() * number); 
      var random_j = Math.floor(Math.random() * number); 
      if (numbergrid[random_i][random_j] > 50) {
          start_i = random_i;
          start_j = random_j;
          startingSet = true;
      }
  }
  
  for(var i = 0; i < number; i++) { // KW: loop through rows
      for(var j = 0; j < number; j++) { //KW: loop through columns (or other way around)
        var g = document.createSvg("g");
        g.setAttribute("transform", ["translate(", i*size, ",", j*size, ")"].join("")); // KW: moves over to the place where next tile should be
        g.setAttribute("stroke", "#ECF0F1");// KW: very bright shade of grey
        var elementId = number * i + j; //KW: give each tile its own ID (numbers from 0 to 120)
        var box = document.createSvg("rect"); // KW: draws a box of the size that each tile should have
        box.setAttribute("width", size);
        box.setAttribute("height", size);
        box.setAttribute("fill", "white");
        box.setAttribute("fill-opacity", 0.1);
        box.setAttribute("stroke-opacity", 0.1);
        box.setAttribute("id", "square-" + elementId); // KW: give tile a number between 0 and 120
        box.xpos = i; //KW: position the box on grid
        box.ypos = j;
        

        // Array of fish number recorded in this square
        box.nFishHistory = [];

        // Text to show number of fish in this square

        var text = document.createSvg("text");
        text.nfish = numbergrid[i][j]; //KW: get the text that should be in that position
        text.setAttribute('x', size / 2); // KW: to position it in the middle of the tile
        text.setAttribute('y', size / 2);
        text.setAttribute('font-size', '30%');
        text.setAttribute('fill', 'white');
        text.setAttribute('fill-opacity', 0.7);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-family', 'Cabin');
        text.setAttribute('stroke-opacity', 0);
        text.textContent = '';
        
        // KW: for the start square fill in the information and make the background a little brighter
        if (i == start_i & j == start_j) {
          box.setAttribute("fill",'white');
          box.setAttribute("fill-opacity", 0.3);
          box.setAttribute("data-click",1);   
          box.nFishHistory.push(text.nfish);
          text.textContent = text.nfish;

          // KW: save the number if fish "caught" at start and where they were
          if (understood) {
            trialData.zcollect.push(text.nfish);
            trialData.xcollect.push(start_i);
            trialData.ycollect.push(start_j);
          }

        }
        // KW: adding the text in each tile, the box where the text goes and the little boat (externally created) as child nodes of the tile
        g.appendChild(text);
        g.appendChild(box);
        g.appendChild(boat);
        svg.appendChild(g); // KW: adding the tile svg to the whole grid
      }  // KW: repeat for each tile
  }
  
  // What to do when the grid is clicked 
  // KW: overview of different Events that could be used and what they mean: https://www.w3schools.com/jsref/dom_obj_event.asp 
  
  $(svg).click(
    function(e){ // KW: e is the MouseEvent that gives infos on the button click
      if (outcomeOpen == false & training_clickable == true) { //KW: (unsure) outcomeOpen: total win of trial not yet decided (can still click), training_clickable: can click
          var targetElement = e.target; //KW: element that was clicked (the tile svg I guess)
          // if(targetElement.getAttribute("data-click") != null)
          //     return;
          targetElement.setAttribute("fill",'white');// KW: makes the clicked tile become whiter
          targetElement.setAttribute("fill-opacity", 0.3);
          targetElement.setAttribute("data-click",1);  

          // gaussian noise
          var noiseGenerator = Prob.normal(0, 1.0);
          var noise = Math.round(noiseGenerator());

          // Add noise
          var nFishThisTrial = targetElement.parentElement.firstElementChild.nfish + noise;

          // Deal with bad noise --> make sure nFish can never be more than 100 or less than 0
          if (nFishThisTrial > 100) {
            nFishThisTrial = 100;
          }
          if (nFishThisTrial < 0) {
            nFishThisTrial = 0;
          }
          
          // Data --> save the number of fish "found" in the first square
          if (understood) {
            trialData.zcollect.push(nFishThisTrial);
            trialData.xcollect.push(targetElement.xpos);
            trialData.ycollect.push(targetElement.ypos);
          }



          // Calculate fish and add to array
          targetElement.parentElement.firstElementChild.textContent = nFishThisTrial; // KW: retrieve fish in clicked tile
          targetElement.nFishHistory.push(nFishThisTrial);// KW: save them in fish history of that tile

          svg.setAttribute("clicked", true);

          // IF FISH ARE CAUGHT
          
              outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'You caught ' + nFishThisTrial + ' fish!';
              outcome.getElementsByClassName("textcontainer").textcontainer.innerHTML += '<br><br><img src="assets/fish.svg" width=100%>'
              scoreNumber += nFishThisTrial;
              nclicks -= 1;
              score.innerHTML = "Score this block: " + scoreNumber + "<br>Clicks left: " + nclicks + "<br><font color='#9c9c9c'>Total score: " + totalScore + "</font>";

              if (nclicks > 0) { //KW: outcome box go away after 1s
                  setTimeout(function() {
                    outcome.style.display = "none";
                    boat.style.display = "none";
                    outcomeOpen = false;
                }, 1000)
                if (nclicks == 5) {
                  startBonusRound(totalBonusRounds)
                }
              }
              else {
                complete = true;
                
                searchHistory.xcollect.push(trialData.xcollect);
                searchHistory.ycollect.push(trialData.ycollect);
                searchHistory.zcollect.push(trialData.zcollect);
                
                // !! SAVE DATA HERE !! //
                // Variables to save:
                // JSON.stringify(searchHistory)
                // totalScore
                saveDataFirebase();
                
                setTimeout(function() { //KW: say end of block and create continue button after 1.5s
                  outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'End of block!';
                  outcome.getElementsByClassName("textcontainer").textcontainer.appendChild(button);
                }, 1500)
              }
              
          // KW: end of the "when clicked" function
          // KW: position and size the outcome box (score,etc) and the little boat that moves around on the grid
          outcome.style.display = "flex";
          boat.style.display = "block";
          boat.style.width = (400 / number) + 'px';
          boat.style.height = (400 / number) + 'px';
          boat.getElementsByClassName("boatImg")[0].style.width = (400 / number) + 'px';
          boat.style.top = targetElement.ypos * (400 / number) + "px";
          boat.style.left = targetElement.xpos * (400 / number) + "px";
          outcomeOpen = true;
          
      }

    }
    // KW: end of the event listener for the click
  ); //KW: false = bubbling propagaion but irrelevant in this case
  
  // This shows previous numbers of fish caught when hovering the mouse over a square on the grid   
  $(svg).mouseover(
    function(e){
      var targetElement = e.target;

      // Fish history hover box
      fishHistory.style.left = targetElement.xpos * 50 + "px";
      fishHistory.style.top = targetElement.ypos * 50 + "px";
      if (targetElement.nFishHistory.length) { //KW: if there are fish in history then display history otherwise disp not fished here before
        fishHistory.innerHTML = targetElement.nFishHistory;
      }
      else {
        fishHistory.innerHTML = "You haven't fished here before";
      }
      
      //KW: delay for fish history to appear
      var historyAppear = setTimeout(function() {
        fishHistory.style.opacity = 1;
      }, 1000); //KW: I found it a bit confusing that it takes 2.5s for the box to appear (felt like program lagging) so now only 1s


      // KW: make it more white if has been clicked than if hasn't (but not if it is the red bonus round tile)
      if (targetElement.getAttribute("fill") == 'white'){
      if(targetElement.getAttribute("data-click") != null) {
        targetElement.setAttribute("fill-opacity", 0.5)
      }
      else {
        targetElement.setAttribute("fill-opacity", 0.2);
      }
    }
    }
  );
  
  // KW: what happens when mouse is no longer over the tile
  $(svg).mouseout(
    function(e){
      var targetElement = e.target;
      fishHistory.style.opacity = 0; // stop showing the fish history
      if(targetElement.getAttribute("fill") == 'white'){ // this makes sure that red bonus tile stays untouched
      if(targetElement.getAttribute("data-click") != null) { // KW: if target was clicked in the process then make sure it stays highlighted
        targetElement.setAttribute("fill-opacity", 0.3)
      }
      else {
        targetElement.setAttribute("fill-opacity", 0.1);
      }
    }
    }
  );
return svg;
};

// https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// https://stackoverflow.com/questions/41661287/how-to-check-if-an-array-contains-another-array/41661348#41661348
function isArrayInArray(source, search) {
  var searchLen = search.length;
  for (var i = 0, len = source.length; i < len; i++) {
      // skip not same length
      if (source[i].length != searchLen) continue;
      // compare each element
      for (var j = 0; j < searchLen; j++) {
          // if a pair doesn't match skip forwards
          if (source[i][j] !== search[j]) {
              break;
          }
          return true;
      }
  }
  return false;
}


var getRandomStimuli = function(n) {
  randomStimuli = [];
  
  for (var i = 0; i < n; i++) {
    var found = false;
    while (!found) {
      var x = Math.floor(Math.random() * featureRange);
      var y = Math.floor(Math.random() * featureRange);
      var item = [x,y];
      //Has it been selected yet?
      var previouslySelected = false;
      for (var j = 0; j < 6; j ++){ // 6 = currentBlock
        var item_j = [trialData.xcollect[j], trialData.ycollect[j]];
        if (arraysEqual(item, item_j)){
          previouslySelected = true;
          break
        }
      }
      if (!previouslySelected && !isArrayInArray(randomStimuli, item)) { //Also check that it's not already been added
        randomStimuli.push(item);
        found = true;
      }
    }
  }
  return randomStimuli;
}

//changes inner HTML of div with ID=x to y
function change(x, y) {
  document.getElementById(x).innerHTML = y;
}

// runs the bonus, called in main script after 5th block
function runBonus(numbergrid) {

  // The overall container thing
  newBlock.style.opacity = 0.65;//KW: here it makes sense
  var container = document.getElementById("ocean");

  // there never is a kraken in the bonus round

  container.appendChild(createBonusGrid(11, 10, numbergrid));

  container.appendChild(outcome);
  container.appendChild(score);
  container.appendChild(boat);
  container.appendChild(newBlock);

  container.appendChild(fishHistory);

  setTimeout(function () {
   newBlock.style.opacity = 0; //KW: "next block" alert goes away after 1s
  }, 1000)
  setTimeout(function () {
    container.removeChild(newBlock); //KW: for some reason actually need to remove the node that says next block
   }, 2000)
  currentBlock +=1;

}


// starts the real bonus part of the bonus round (after 6 clicks) aka the estimation of fish in 5 random non-selected tiles and selection of one of the 5 tiles.
function startBonusRound(totalBonusRounds){
  //Show other divs
  document.getElementById('bonusRoundDiv').style.display = "block";
  document.getElementById('estimateSlider').value = 50
  document.getElementById('confidenceSlider').value = 6
  //Initialize counter and select new stimuli
  bonusStimuli = getRandomStimuli(totalBonusRounds);
  bonusCounter = 0;
  //Show the first stimuli
  // highlight new selected option
  tile = document.getElementById("square-" + (bonusStimuli[bonusCounter][0] * 11 + bonusStimuli[bonusCounter][1])) 
  tile.setAttribute("fill",'#FF2020');
  tile.setAttribute("fill-opacity", 0.8);
  var placeholder = document.getElementById("ocean").firstElementChild // get grid element
  $(placeholder).off("click") // make grid not clickable 
  //change text above stimuli
  change('krakenPresent', 'Bonus Round: 1 of '+ totalBonusRounds);
  // slider where indicate number of fish
  var estimateSlider = document.getElementById("estimateSlider")
  estimateSlider.oninput = function() {
    estimateSliderMoved = true;
    estimate = estimateSlider.value
    change("output", estimate + " fish")
  }
  // confidence slider
  var confidenceSlider = document.getElementById('confidenceSlider')
  confidenceSlider.oninput = function() {
    confidenceSliderMoved = true;
  }

  // submit button for submitting the judgement. Had to create it here bc it otherwise wouldn't become clickable.
  var submit = document.createElement("button");
  submit.setAttribute('class', 'button')
  submit.setAttribute('id', 'submit')
  submit.innerHTML = 'submit';
  document.getElementById('bonusRoundDiv').appendChild(submit)

  submit.onclick = function(){ // had to copy the submitBonusJudgment function in here bc it wouldn't work otherwise
    // make confidence either the value of the confidence slider or null
    var confidence = confidenceSlider != null ? confidenceSlider.value : null;
   // same for estimate but defined the variable in beginning of script because I also need it for number next to estimate slider
    estimate = estimateSlider != null ? estimateSlider.value : null;
    if (confidence == null || !estimateSliderMoved || !confidenceSliderMoved) {
      alert("Please move all sliders at least once.");
      return;
    }  
    //Save data
    var grid = grids[envOrder[currentBlock - 2]] // -2 bc current block has already been incremented
    var z = grid[bonusStimuli[bonusCounter][0]][bonusStimuli[bonusCounter][1]];

    bonusCollect.bonusStimuli[bonusCounter] = {
      "x": bonusStimuli[bonusCounter][0],
      "y": bonusStimuli[bonusCounter][1],
      "z": z,
      "givenValue": parseInt(estimate),
      "howCertain": parseInt(confidence)
    }
    bonusCounter = bonusCounter + 1; //increment counter
    if (bonusCounter+1 <= totalBonusRounds){ //If more rounds remaining, +1 bc bonus counter starts at 0
      change('krakenPresent', 'Bonus Round: ' + (bonusCounter + 1) +' of '+totalBonusRounds);
      // reset inputs
      confidenceSlider.value = 6;
      estimateSlider.value = 50;
      change("output", "50 fish")
      estimateSliderMoved=false;
      confidenceSliderMoved=false;
      //change highlighted tile
      tile.setAttribute("fill-opacity", 0.1);
      tile.setAttribute("fill",'white');
      // highlight new selected option
      tile = document.getElementById("square-" + (bonusStimuli[bonusCounter][0] * 11 + bonusStimuli[bonusCounter][1]))
      tile.setAttribute("fill",'#FF2020');
      tile.setAttribute("fill-opacity", 0.8);
   
    }else{//bonus round over; start forced choice

     // get rid of sliders and submit button
     document.getElementById('bonusRoundDiv').style.display = "none";
     document.getElementById('submit').style.display = "none";
     // highlight all the bonus stimuli
     for (var i=0; i<totalBonusRounds; i++){//Loop through bonus stimuli
      tile = document.getElementById("square-" + (bonusStimuli[i][0] * 11 + bonusStimuli[i][1]))
      tile.setAttribute("fill",'#FF2020');
      tile.setAttribute("fill-opacity", 0.8);
     }
     change('krakenPresent', '<b>Which one of these <span style = "color:red">red</span> squares will you fish from?</b>');
     // the rest of this is mostly a copy from the create grid function except that at the first click, they have to choose one of the bonus tiles
     var svg = document.getElementById("ocean").firstElementChild
     svg.addEventListener( 
      "click",
      function(e){ // KW: e is the MouseEvent that gives infos on the button click
        if (outcomeOpen == false & training_clickable == true) { //KW: (unsure) outcomeOpen: total win of trial not yet decided (can still click), training_clickable: can click
            var targetElement = e.target; //KW: element that was clicked (the tile svg I guess)
            // determine whether they clicked one of the bonus stimuli
            var validChoice = false
            for (var i=0; i<totalBonusRounds; i++){//Loop through bonus stimuli
              if (arraysEqual([targetElement.xpos, targetElement.ypos], [bonusStimuli[i][0], bonusStimuli[i][1]])){
                validChoice = true
                break
              }
            }
  
            if (validChoice || nclicks < 5){ // if already chose 1 of the bonus tiles then also go here
                // this part of the if-else statement is just the same as the usual stuff that happens when select a tile and no kraken is around.
              targetElement.setAttribute("fill",'white');// KW: makes the clicked tile become whiter
              targetElement.setAttribute("fill-opacity", 0.5);
              targetElement.setAttribute("data-click",1);  
    
              // gaussian noise
              var noiseGenerator = Prob.normal(0, 1.0);
              var noise = Math.round(noiseGenerator());
    
              // Add noise
              var nFishThisTrial = targetElement.parentElement.firstElementChild.nfish + noise;
    
              // Deal with bad noise --> make sure nFish can never be more than 100 or less than 0
              if (nFishThisTrial > 100) {
                nFishThisTrial = 100;
              }
              if (nFishThisTrial < 0) {
                nFishThisTrial = 0;
              }
              
              // Data --> save the number of fish "found" in the first square
              if (understood) {
                trialData.zcollect.push(nFishThisTrial);
                trialData.xcollect.push(targetElement.xpos);
                trialData.ycollect.push(targetElement.ypos);
              }
    
              // Calculate fish and add to array
              targetElement.parentElement.firstElementChild.textContent = nFishThisTrial; // KW: retrieve fish in clicked tile
              targetElement.nFishHistory.push(nFishThisTrial);// KW: save them in fish history of that tile
    
              svg.setAttribute("clicked", true);
    
              // IF FISH ARE CAUGHT
              
              outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'You caught ' + nFishThisTrial + ' fish!';
              outcome.getElementsByClassName("textcontainer").textcontainer.innerHTML += '<br><br><img src="assets/fish.svg" width=100%>'
              scoreNumber += nFishThisTrial;
              nclicks -= 1;
              score.innerHTML = "Score this block: " + scoreNumber + "<br>Clicks left: " + nclicks + "<br><font color='#9c9c9c'>Total score: " + totalScore + "</font>";
              
            if (nclicks > 0) { //KW: outcome box go away after 1s
                setTimeout(function() {
                  outcome.style.display = "none";
                  boat.style.display = "none";
                  outcomeOpen = false;
              }, 1000)
              
  
              // remove the highlight from the remaining bonus stimuli if this is the click where they choose one of the bonus stimuli, also change text above grid
              if (nclicks == 4) { // not 5 bc already subtracted 1 from counter
              for (var i=0; i<totalBonusRounds; i++){//Loop through bonus stimuli
                if (arraysEqual([targetElement.xpos, targetElement.ypos], [bonusStimuli[i][0], bonusStimuli[i][1]])){
                  continue
                }
                tile = document.getElementById("square-" + (bonusStimuli[i][0] * 11 + bonusStimuli[i][1]))
                tile.setAttribute("fill-opacity", 0.1);
                tile.setAttribute("fill",'white');
              }
                change('krakenPresent', "<b>Continue fishing. The kraken is still feeding elsewhere.</b>")
              }

            } else {
                complete = true;
              
                searchHistory.xcollect.push(trialData.xcollect);
                searchHistory.ycollect.push(trialData.ycollect);
                searchHistory.zcollect.push(trialData.zcollect);

              
              // !! SAVE DATA HERE !! //
              // Variables to save:
              // JSON.stringify(searchHistory)
              // totalScore
                saveDataFirebase(); 
              
                setTimeout(function() { //KW: say end of block and create continue button after 1.5s
                  outcome.getElementsByClassName("textcontainer").textcontainer.textContent = 'End of block!';

                  outcome.getElementsByClassName("textcontainer").textcontainer.appendChild(button);
                }, 1500)

                
              }
              
              outcome.style.display = "flex";
              boat.style.display = "block";
              boat.style.width = (400 / 11) + 'px';// here and in the following lines I replaced the original 400/number by 400/11 bc I didn't wanna define number again
              boat.style.height = (400 / 11) + 'px';
              boat.getElementsByClassName("boatImg")[0].style.width = (400 / 11) + 'px';
              boat.style.top = targetElement.ypos * (400 / 11) + "px";
              boat.style.left = targetElement.xpos * (400 / 11) + "px";
              outcomeOpen = true;
            
             } else{ // this is what happens when they don't click one of the 5 bonus tiles
               alert("You need to pick one of the 5 highlighted tiles.")
             }
            
        } // end of the when clicked function
      }
      
     ) // end of the event listener
    }
  }
}


// START
init();

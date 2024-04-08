// ==UserScript==
// @name         Triglav
// @namespace    http://tampermonkey.net/
// @version      1.12.2
// @description  ♿️♿️♿️
// @author       wojnarkw, edited by xdaaugus and sitarsk
// @match        *://fcresearch-eu.aka.amazon.com/*/results?s=*
// @icon         https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Symbol_of_Veles.svg/800px-Symbol_of_Veles.svg.png
// @grant        GM.xmlHttpRequest
// @updateURL    https://amazon.eitho.fun/triglav.user.js
// @downloadURL  https://amazon.eitho.fun/triglav.user.js
// ==/UserScript==


/*
Release notes:
1.12.0 - 2023.03.08 - xdaaugus
- added caching for the remove data - decreased loading time
- changed style of the remove data <span> element to ensure that employee will notice FBA item type
1.12.1 - 2023.06.01 - xdaaugus
- fixed bug with gravis
1.12.2 - 2023.10.11 - sitarsk
 - TBD, this is Sparta!
*/

;
(function() {
    'use strict';
    // console.log(foo);
    //====================KONFIGURACJA===================
    const marketPlaces = 'DE';
    const fulfillmentCenter = 'WRO1';
    const customersReturnSortingCode = 'WRO1_GradingSorting';
    const unsellableContainer = 'tsTRLIQN01';
    const sellableContainer = 'tsTRSTOW01';
    const triglavAccent = 'blueviolet';
    const cRetContainerPrefix = 'wsNSort';
    //==================box configuration================
    const boxes = [
        {name:"A3", length:35.1, width:24.8, height:3.8, volume:3.31},
        {name:"E0", length:22.8, width:16, height:10.2, volume:3.72},
        {name:"CAL20", length:69.5, width:48.5, height:1.3, volume:4.38},
        {name:"M1", length:28.3, width:22.5, height:7, volume:4.46},
        {name:"CAL30", length:84.5, width:60, height:1, volume:5.07},
        {name:"M2", length:31.5, width:23, height:7, volume:5.07},
        {name:"C4", length:31, width:25, height:7, volume:5.43},
        {name:"M3", length:35, width:27.5, height:7, volume:6.74},
        {name:"MP5X", length:80, width:11, height:8, volume:7.04},
        {name:"M4", length:37.5, width:32, height:7, volume:8.4},
        {name:"N20", length:71, width:15, height:10, volume:10.65},
        {name:"E3", length:30.5, width:22.8, height:18.3, volume:12.73},
        {name:"N0", length:61, width:25, height:10, volume:15.25},
        {name:"N22", length:71, width:20, height:13, volume:18.46},
        {name:"N1", length:51, width:41, height:10, volume:20.91},
        {name:"E6", length:40.6, width:30.5, height:20.3, volume:25.14},
        {name:"N3", length:71, width:41, height:10, volume:29.11},
        {name:"N2", length:51, width:36, height:16, volume:29.38},
        {name:"N5", length:61, width:41, height:15, volume:37.52},
        {name:"N7", length:76, width:56, height:10, volume:42.56},
        {name:"V30", length:50.8, width:40.8, height:21, volume:43.53},
        {name:"N10", length:71, width:51, height:15, volume:54.32},
        {name:"K88", length:90, width:25, height:25, volume:56.25},
        {name:"V40", length:50.8, width:40.8, height:30, volume:62.18},
        {name:"K89", length:113, width:25, height:25, volume:70.63},
        {name:"EX0", length:101.5, width:59.5, height:12.5, volume:75.49},
        {name:"BOD5", length:160, width:50, height:10, volume:80},
        {name:"V70", length:60, width:45, height:31, volume:83.7},
        {name:"V120", length:75, width:55, height:22, volume:90.75},
        {name:"V80", length:60, width:45, height:40, volume:108},
        {name:"EX2", length:130.5, width:69.5, height:12.5, volume:113.37},
        {name:"V100", length:65, width:50, height:35, volume:113.75},
        {name:"EX1", length:119.5, width:59.5, height:20.5, volume:145.76},
        {name:"V140", length:75, width:55, height:40, volume:165},
        {name:"K60", length:57, width:57, height:52, volume:168.95},
        {name:"EX4", length:111.5, width:51.5, height:33.5, volume:192.37}
    ]
    //=================KONIEC KONFIGURACJI===============
    //=======================language====================
    //=====================inner config==================
    const performConfiguration = () => {
        const config = {};
        config.isWHDProblemSolver = confirm('Are you a Problem Solver?\nOK - yes, Cancel - no');
        localStorage.setItem('triglav-config', JSON.stringify(config));
        return config;
    }
    const config = JSON.parse(localStorage.getItem('triglav-config')) || performConfiguration();
    const today = new Date();
    const halfYearAgo = new Date((new Date()).setDate(today.getDate()-179));
    const prepareDate = function(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth()+1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return month + '%2F' + day + '%2F' + year
    }
    const startDate = prepareDate(halfYearAgo);
    const endDate = prepareDate(today);
    const getInventoryHistoryAddress = function(subject) {
        return 'https://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
            '/results/inventory-history?s=' + subject +
            '&startSearchDateString=' + startDate +
            '&endSearchDateString=' + endDate +
            '&dateStringFormat=MM%2Fdd%2Fyyyy'
    }
    //==================waiting for ready================
    const waitForTrue = function(condition) {
        return async function (resolve, reject) {
            let isLoaded = false;
            while(!isLoaded) {
                isLoaded = await (
                    new Promise(
                        (resolve) => {
                            setTimeout(()=>{
                                resolve(condition())
                            }, 200)
                        }
                    )
                );
            }
        }
    }
    //================Enqueued XHR requests==============
    const MAX_CONNECTIONS = 50;
    let currentRequests = 0;
    const awaitingRequests = [];
    const sendRequestFromQeue = ()=>{
        if (awaitingRequests.length) {
            enqueuedXHR(awaitingRequests.shift());
        }
    }
    async function enqueuedXHR(XHRObject){
        if (currentRequests < MAX_CONNECTIONS) {
            currentRequests++;
            const mainOnloadFunction = XHRObject.onload;
            XHRObject.onload = function(resp) {
                mainOnloadFunction(resp);
                currentRequests--;
                sendRequestFromQeue();
            };
            GM.xmlHttpRequest(XHRObject);
        } else awaitingRequests.push(XHRObject);
    }
    //================ICQA tools' requests===============
    const action = (objectToken, instructionId, actionName, input) => new Promise(
        (resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'http://aft-qt-eu.aka.amazon.com/action',
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    action: actionName,
                    id: {
                        instructionId: instructionId,
                        objectId: objectToken
                    },
                    input: input
                }),
                onload: resp => resolve()
            });
        }
    );
    const end = (objectToken, instructionId, tool) => new Promise(
        (resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'http://aft-qt-eu.aka.amazon.com/end',
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    id: {
                        instructionId: instructionId,
                        objectId: objectToken
                    },
                    tool: tool
                }),
                onload: resp => resolve()
            });
        }
    );
    const status = (objectToken, instructionId, actionName, input) => new Promise(
        (resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: 'http://aft-qt-eu.aka.amazon.com/status',
                headers: {
                    "Content-Type": "application/json"
                },
                data: JSON.stringify({
                    id: {
                        instructionId: instructionId,
                        objectId: objectToken
                    },
                }),
                onload: async resp => {
                    const status = JSON.parse(resp.response).status;
                    if (status === 'READY') {
                        resolve(status);
                    } else await resolve(objectToken, instructionId, actionName, input)
                }
            });
        }
    );
    //====================code printing==================
    const zebraPrinterAdress = (function(){
        const cookies = document.cookie.split(';');
        const printerCookie = cookies.find(el => el.trim().startsWith('cfg-pip='));
        return decodeURI(printerCookie?.split('=')[1].trim()) || 'http://localhost:5964/';
    })();
    const printLabelRow = document.createElement('tr');
    const printLabelRowHeader = document.createElement('th');
    printLabelRowHeader.innerText = 'Print label';
    printLabelRow.appendChild(printLabelRowHeader);
    const printLabelTd = document.createElement('td');
    printLabelRow.appendChild(printLabelTd);
    const codeToPrintInput = document.createElement('input');
    const printCodeButton = document.createElement('button');
    printCodeButton.innerText = 'Print!';
    printCodeButton.style.marginLeft = '5px';
    printLabelTd.appendChild(codeToPrintInput);
    printLabelTd.appendChild(printCodeButton);
    codeToPrintInput.setAttribute('type', 'text');
    printCodeButton.addEventListener('click', ()=>{
        GM.xmlHttpRequest({
            method: 'POST',
            url: zebraPrinterAdress,
            data: '^XA^FO206,180^BY2,0,100^BCN,100,Y,Y,N,D^FD' + codeToPrintInput.value + '^FS^PQ1^XZ'
            // onload: function(resp) {console.log(resp)}
        });
    });
    //================Triglav box structure==============
    const triglavHeader = document.createElement('div');
    triglavHeader.innerHTML = '<div class="a-box a-first a-box-title"><div class="a-box-inner">' +
        '<div class="a-row"><div class="a-column">' +
        '<span class="a-size-large section-title a-text-bold">Triglav</span>' +
        '<span id="triglav-config" class="help" style="font-size: .83em; vertical-align: super;"><a href="#">Settings</a></span>'+
        '</div></div>' +
        '</div></div>';
    triglavHeader.className = 'a-box a-first a-box-title';
    const triglavOuterBox = document.createElement('div');
    triglavOuterBox.className = 'section-placeholder';
    const triglavBox = document.createElement('div');
    triglavBox.className = 'a-box-group a-spacing-large a-spacing-top-medium';
    triglavOuterBox.appendChild(triglavBox);
    triglavBox.appendChild(triglavHeader);
    const triglavContent = (function(){
        const outer = document.createElement('div');
        outer.className = 'a-box a-last';
        const mid = document.createElement('div');
        mid.className = 'a-box-inner';
        const inner = document.createElement('div');
        inner.className ='a-row';
        outer.appendChild(mid);
        mid.appendChild(inner);
        return inner;
    })();
    triglavBox.appendChild(triglavContent);
    const triglavTableArea = document.createElement('div');
    triglavTableArea.className = 'a-box a-column a-span8';
    const triglavTable = document.createElement('table');
    triglavTable.className = 'a-keyvalue';
    triglavTable.style.borderRight = '1px solid lightgray'
    const triglavTableBody = document.createElement('tbody');
    triglavTableBody.appendChild(printLabelRow);
    triglavTable.appendChild(triglavTableBody);
    triglavTableArea.appendChild(triglavTable);
    triglavContent.appendChild(triglavTableArea);
    document.getElementById('results-content').insertAdjacentElement('afterbegin', triglavOuterBox);
    document.getElementById('triglav-config').addEventListener(
        'click',
        ()=>{
            performConfiguration();
            alert('Reload page to apply changes');
        }
    )
    triglavBox.insertAdjacentHTML('beforebegin', '<a class="section-nav" id="triglav-nav"></a>');
    document.getElementById('sections-list').insertAdjacentHTML(
        'afterbegin',
        '<li class="" id="triglav-status"><a href="#triglav-nav"><i class="s-icon-status"></i>Triglav</a></li>'
    )
    const triglavLog = document.createElement('div');
    triglavLog.className = 'a-box a-column a-span3';
    triglavLog.id = 'triglav-log';
    const triglavLogStyle = document.createElement('style');
    triglavLogStyle.innerHTML = '#triglav-log > * {' +
        'border-left: 5px solid ' + triglavAccent + ';' +
        'margin-bottom: 1em;' +
        'margin-top: 0.5em;' +
        'padding: 3px;' +
        'padding-left: 8px;'
    '}';
    document.head.appendChild(triglavLogStyle);
    triglavContent.appendChild(triglavLog);
    //=====================PanDash info==================
    const repetitionLimit = 5;
    const fetchPandashInfo = function (asin, repetition) {
        const pandashRequestData = 'language=EN&source=retail-rbs&marketPlaces=' + marketPlaces +
              '&asins=' + asin + '&sidx=product.asin&rows=99999&page=1&sord=desc' +
              '&isExportOnly=FALSE&fileName=' + userLogin + '_retail-rbs_EN_2021917232049335&fc=&pandashservice='
        GM.xmlHttpRequest({
            method: 'POST',
            url: 'https://pandash.amazon.com/GridServlet',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            data: pandashRequestData,
            onload: function(resp) {
                try {
                    const responseObj = JSON.parse(resp.response);
                    const hazmatMessage = document.createElement('p');
                    if (responseObj.rows) {
                        const hazmatLevel = responseObj.rows[0].level;
                        hazmatMessage.innerHTML = 'Hazmat level (PanDash - ' + marketPlaces + '):<br>' + hazmatLevel +
                            '<span style="font-size: 0.8em;"> (' + responseObj.rows[0].dropZone + ')</span>';
                    } else {
                        console.log(responseObj, asin)
                        hazmatMessage.innerHTML = 'Login to Midway to discover hazmat level'
                    }
                    triglavLog.appendChild(hazmatMessage);
                } catch(er) {
                    if (repetition <= repetitionLimit) fetchPandashInfo(asin, repetition+1)
                }
            }
        });
    }
    //================Dimensions' category===============
    const getDimensions = function(productTableHeaders){
        const dimensions = productTableHeaders.find(
            thElem => thElem.innerText === 'Wymiary'
        ).nextElementSibling
        const dimensionsArray = dimensions.innerText.split(' ').map(
            elem => Number(elem.trim())
        ).filter(
            elem => /^\d/g.test(elem)
        );
        return dimensionsArray;
    }
    const getDimensionsCategory =
          function(productTableHeaders, dimensionsArr){
              if (dimensionsArr.length < 3) return 'CUBISCAN';
              const weightRow = productTableHeaders.find(
                  thElem => thElem.innerText === 'Waga'
              ).nextElementSibling;
              const weight = weightRow.innerText.trim().split(' ')[0];
              if (weight === '') return 'CUBISCAN';
              if (45 <= weight) {
                  return 'MechLift';
              } else if (23 <= weight) {
                  return 'HNS';
              } else if (15 <= weight) {
                  if (120 <= dimensionsArr[1]) {
                      return 'LPTL';
                  } else {
                      return 'TLNS';
                  }
              } else if (120 <= dimensionsArr[1]) {
                  return 'LP'
              } else {
                  const palletType = (()=>{
                      if (105 < dimensionsArr[1]) {
                          return 'gaylord';
                      } else if (40 <= dimensionsArr[1] || 7 <= weight) {
                          return 'blue cage'
                      } else return 'silver cart';
                  })();
                  return ((
                      dimensionsArr[1]<45.5 &&
                      dimensionsArr[2]<34 &&
                      dimensionsArr[0]<26.5 &&
                      weight<12.3
                  ) ? 'S' : 'NS') + '-' + palletType;
              }
          }
    //=================ReLo Problem report===============
    const addReportButton = !config.isWHDProblemSolver ? () => {} : function(buttonText, searchSubject, groupID, taskID, secondChoiceFieldId, login) {
        const reportParagraph = document.createElement('p');
        const reportButton = document.createElement('button');
        reportButton.innerText = buttonText;
        reportButton.addEventListener('click', () => {
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://relo-ps-tool.corp.amazon.com/task?category_id=169&function_id=51&group_id=248',
                onload: function (response) {
                    const workspace = document.createElement('div');
                    workspace.innerHTML = response.responseText;
                    if (Array.from(workspace.getElementsByClassName('default_input')).filter(el => el.id === 'workstation').offsetParent) {
                        GM.xmlHttpRequest({
                        method: 'POST',
                        url: 'https://relo-ps-tool.corp.amazon.com/set_ws',
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        data: 'utf8=%E2%9C%93&authenticity_token=' + encodeURIComponent(currentToken) + '&workstation=WHD&commit=Kontynuuj',
                        onload: function(resp) {
                            const workspace = document.createElement('div');
                            workspace.innerHTML = resp.responseText;
                            if (workspace.getElementsByClassName('flash success').length){
                                reportParagraph.innerHTML = 'Sent successfully ʕ•ᴥ•ʔ';
                            } else reportParagraph.innerHTML = 'Something went wrong (╯°□°)╯︵ ┻━┻';
                        }
                    });

                    }
                    const currentToken = workspace.querySelector('meta[name=csrf-token]').getAttribute('content');
                    const rawData = 'utf8=%E2%9C%93&authenticity_token=' + encodeURIComponent(currentToken) +
                          '&category_id=169&function_id=51' +
                          '&group_id=' + groupID +
                          '&task_id=' + taskID +
                          '&2=' + searchSubject +
                          '&choice_field_id=2' + (secondChoiceFieldId ? '&' + secondChoiceFieldId + '=' + login: '') +
                          '&choice_field_id=' + (secondChoiceFieldId ? secondChoiceFieldId : '70') + '&commit=Wyslij';
                    console.log(currentToken);
                    GM.xmlHttpRequest({
                        method: 'POST',
                        url: 'https://relo-ps-tool.corp.amazon.com/result',
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        data: rawData,
                        onload: function(resp) {
                            const workspace = document.createElement('div');
                            workspace.innerHTML = resp.responseText;
                            if (workspace.getElementsByClassName('flash success').length){
                                reportParagraph.innerHTML = 'Sent successfully ʕ•ᴥ•ʔ';
                            } else reportParagraph.innerHTML = 'Something went wrong (╯°□°)╯︵ ┻━┻';
                        }
                    });
                }
            });
        } );
        reportParagraph.appendChild(reportButton);
        triglavLog.appendChild(reportParagraph);
    }
    //================
    document.head.insertAdjacentHTML(
        'beforeend',
        '<style>' +
        'table.a-bordered tr {padding:2px 4px 2px;}' +
        'table.a-bordered tr:hover {background-color: #B5EEF1}' +
        'table.a-bordered tr.even:nth-child(2n):hover, {background-color: #B5EEF1}' +
        'table.a-bordered td, table.a-bordered th {padding: inherit}' +
        'table.a-bordered td, table.a-bordered th {border: auto}' +
        '</style>');
    const userLogin = document.getElementsByClassName('a-fixed-right-grid')[0].innerText.trim();
    const searchSubject = document.getElementById('search').getAttribute('placeholder').trim();
    if (searchSubject.startsWith('LPN')) {
        const reportCRetSortFail = (login) => {
            addReportButton('C-Ret sorting failed', searchSubject, 248, 1225, login);
        }
        let mayByNotSorted;
        //====================BeeTee clicker=================
        const beeTeeParagraph = document.createElement('p');
        const beeTeeButton = document.createElement('button');
        beeTeeButton.innerText = 'Search for manuals via BeeTee';
        beeTeeButton.addEventListener('click', () => {
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://relodashboard.corp.amazon.com/wiki_search',
                onload: function (response) {
                    const workspace = document.createElement('div');
                    workspace.innerHTML = response.responseText;
                    const currentToken = workspace.querySelector('meta[name=csrf-token]').getAttribute('content');
                    GM.xmlHttpRequest({
                        method: 'GET',
                        url: 'https://relodashboard.corp.amazon.com/wiki_search/result/?utf8=%E2%9C%93&lpn_number=' + searchSubject,
                        onload: function(resp) {
                            const workspace = document.createElement('div');
                            workspace.innerHTML = resp.responseText;
                            const iframes = workspace.getElementsByTagName('iframe');
                            if (iframes.length) {
                                beeTeeParagraph.innerHTML = '<a href=' +
                                    iframes[0].src + '>found!</a>'
                            } else {
                                const errorMessage = workspace.getElementsByClassName('flash error')[0];
                                beeTeeParagraph.innerHTML = errorMessage.innerText;
                            }
                        }
                    });
                }
            });
        } );
        beeTeeParagraph.appendChild(beeTeeButton);
        triglavLog.appendChild(beeTeeParagraph);
        //================Triglav box structure==============
        triglavTableBody.insertAdjacentHTML(
            'afterbegin',
            '<tr id="lpninitializedrow" style="display: none"><th>LPN initialized in</th><td id="lpninitialization">Unknown</td></tr>'
        );
        GM.xmlHttpRequest({
            method: 'GET',
            url: `https://eu-cretfc-tools-dub.dub.proxy.amazon.com/getReturnUnitData?lpn=${searchSubject}&locale=pl_PL`,
            onload: function(response){
                if (JSON.parse(response.responseText)[0] === undefined) {
                    document.getElementById('lpninitialization').innerText = '¯\\_(ツ)_/¯';
                    return;
                }
                const responseLpnObject = JSON.parse(response.responseText)[0];
                const adjustGradingTool = function() {
                    if (responseLpnObject.gradingTool === 'Socrates') return responseLpnObject.socratesActivityDataList[responseLpnObject.socratesActivityDataList.length-1]
                    if (responseLpnObject.gradingTool === 'Omaha') return responseLpnObject.activityDataList[responseLpnObject.activityDataList.length-1]
                    return {warehouse: 'Unknown grading tool', gradingTime: {endTime: '?'}, associate: 'unknown'}
                }
                const asin = responseLpnObject.returnUnitProductAttributes.asin
                const cRetLpnLastActivity = adjustGradingTool();
                if (mayByNotSorted) {
                    reportCRetSortFail(cRetLpnLastActivity.associate);
                } else mayByNotSorted = cRetLpnLastActivity.associate
                document.getElementById('lpninitialization').innerHTML =
                    '<a href="http://fcresearch-eu.aka.amazon.com/' + cRetLpnLastActivity.warehouse + '/results?s=' + searchSubject +'">' +
                    cRetLpnLastActivity.warehouse +
                    '</a> on ' + new Date(cRetLpnLastActivity.gradingTime.endTime).toLocaleString('pl-PL',
					{ weekday: "long", day: "numeric",  month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
					) +
                    ' as <a href="http://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter + '/results?s=' + asin +'">' + asin + '</a>' +
                    '<br>' +
                    '(<a href="https://eu-cretfc-tools-dub.dub.proxy.amazon.com/gravis/returnUnit/' + searchSubject + '?selectedLocale=pl_PL">Gravis</a>)';
                document.getElementById('lpninitializedrow').style.display = '';
            }
        });
        (async function(){
            await waitForTrue(
                ()=>(Array.from(document.getElementById('product-status').classList)
                     .find(className => className === 'loading')===undefined)
            )();
            await waitForTrue(
                ()=>(Array.from(document.getElementById('inventory-status').classList)
                     .find(className => className === 'loading')===undefined)
            )();
            await waitForTrue(
                ()=>(Array.from(document.getElementById('inventory-history-status').classList)
                     .find(className => className === 'loading')===undefined)
            )();
            //==================Searching new LPN================
            const tableInventoryHistory = document.getElementById('table-inventory-history').getElementsByTagName('tbody')[0];
            const historyEntries = await (async function(){
                //const loadedHistory = Array.from(tableInventoryHistory.getElementsByTagName('tr'));
                //if (loadedHistory.length) return loadedHistory;
                return await new Promise((resolve, reject) => {
                    enqueuedXHR({
                        method: 'GET',
                        url: getInventoryHistoryAddress(searchSubject),
                        onload: function(response){
                            const workspace = document.createElement('div');
                            workspace.innerHTML = response.responseText;
                            const historyTable = workspace.getElementsByTagName('tbody')[1];
                            resolve(Array.from(historyTable.getElementsByTagName('tr')))
                        }
                    });
                })
            })()
            if (!document.getElementById('inventory-status').getElementsByTagName('a').length) { // LPNHK065888762LPNHK065888762
                // console.log('deviation -1!')
                console.log(historyEntries)
                const changeOut = historyEntries.find((row)=>{
                    const tds = row.getElementsByTagName('td');
                    if (tds.length <= 1) return false
                    else return tds[2].innerText === '4'
                });
                const login = changeOut? changeOut.getElementsByTagName('td')[8].innerText : '';
                console.log(login)
                if (!login) return;
                const date = new Date(changeOut.getElementsByTagName('td')[0].innerText);
                (async function(){
                    const startMargin = date.valueOf()-5000;
                    const endMargin = date.valueOf()+5000;
                    let searchForNewLPN = (fitTimeArr)=>{
                        if (fitTimeArr.length) {
                            const changeIn = fitTimeArr.find(tr => tr.getElementsByTagName('td')[2].innerText === '3');
                            if (changeIn) {
                                const newLPN = changeIn.getElementsByTagName('td')[6].innerText;
                                const css = 'animation: blinker 1s linear infinite;'
                                const cssBlinker = document.createElement('style');
                                cssBlinker.innerHTML = '@keyframes blinker {50% {opacity: 0.5;}';
                                document.head.appendChild(cssBlinker);
                                triglavLog.insertAdjacentHTML(
                                    'afterbegin',
                                    '<p style="text-transform: uppercase; ' + css + '">' +
                                    'LPN was reassigned.<br>Check out new LPN:<br>' +
                                    '<a href="http://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
                                    '/results?s=' + newLPN +
                                    '">' + newLPN + '</a>' +
                                    '</p>'
                                );
                                return true;
                            } else return false;
                        }
                    }
                    const MDYDateString = (date.getMonth()+1).toString().padStart(2, '0') + '%2F' +
                          date.getDate().toString().padStart(2, '0') + '%2F' +
                          date.getFullYear();
                    let paginationToken = await (new Promise((resolve, reject)=>{
                        GM.xmlHttpRequest({
                            method: 'GET',
                            url: 'http://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
                            '/results/inventory-history' +
                            '?s=' + login +
                            '&startSearchDateString=' + MDYDateString +
                            '&endSearchDateString=' + MDYDateString +
                            '&dateStringFormat=MM%2Fdd%2Fyyyy',
                            onload: function(response){
                                const workspace = document.createElement('div');
                                workspace.innerHTML = response.responseText;
                                workspace.getElementsByTagName('div')[0].getElementsByTagName('div')[0].remove();
                                const table = workspace.getElementsByTagName('div')[0].getElementsByTagName('tbody')[0];
                                const trs = Array.from(table.getElementsByTagName('tr'));
                                let fit = trs.filter(tr=>{
                                    const operation = Date.parse(tr.getAttribute('data-row-id'));
                                    return (startMargin < operation && operation < endMargin);
                                });
                                const isSuccess = searchForNewLPN(fit)
                                if (isSuccess) {
                                    resolve('true');
                                } else {
                                    const token = workspace.getElementsByClassName('pagination-token')[0];
                                    if (!token) resolve('true');
                                    const table = workspace.getElementsByTagName('div')[0].getElementsByTagName('tbody')[0];
                                    resolve(token.innerText);
                                }

                            }
                        })
                    }));
                    while (paginationToken !== 'true'){
                        const token = paginationToken;
                        let currentFit;
                        paginationToken = await (
                            paginationToken = new Promise((resolve, reject)=>{
                                if (token!=='true') {
                                    GM.xmlHttpRequest({
                                        method: 'GET',
                                        url: 'http://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
                                        '/results/inventory-history-more?token=' + token,
                                        onload: function(response){
                                            const workspace = document.createElement('div');
                                            workspace.innerHTML = response.responseText;
                                            const table = workspace.getElementsByTagName('div')[0].getElementsByTagName('tbody')[0];
                                            const trs = Array.from(table.getElementsByTagName('tr'));
                                            let fit = trs.filter(tr=>{
                                                const operation = Date.parse(tr.getAttribute('data-row-id'));
                                                return (startMargin < operation && operation < endMargin);
                                            });
                                            const isSuccess = searchForNewLPN(fit)
                                            if (isSuccess) {
                                                resolve('true');
                                            } else {
                                                const token = workspace.getElementsByClassName('pagination-token')[0];
                                                if (!token) resolve('true');
                                                const table = workspace.getElementsByTagName('div')[0].getElementsByTagName('tbody')[0];
                                                resolve(token.innerText);
                                            }
                                        }
                                    })
                                }
                            })
                        );
                    }
                })();
            }
            //=================searching for grader==============
            const lastGrading = historyEntries.find(row => {
                const toolCell = row.getElementsByTagName('td')[13];
                if (toolCell) return toolCell.innerText === 'GrizzlyWebsite';
            });
            if (lastGrading) {
                const lastGrader = lastGrading.getElementsByTagName('td')[8].innerText;
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'http://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter + '/results/employee?s=' + lastGrader,
                    onload: function(response){
                        const workspace = document.createElement('div');
                        workspace.innerHTML = response.responseText;
                        const managerName = workspace.querySelector('[data-row-id]').getElementsByTagName('td')[2].innerText;
                        const graderInfo = document.createElement('div');
                        graderInfo.style.position = 'relative';
                        graderInfo.innerText = 'Last graded by: ' + lastGrader;
                        const graderImage = document.createElement('img');
                        graderImage.setAttribute('alt', '_');
                        graderImage.setAttribute('src', 'http://badgephotos.amazon.com/?uid=' + lastGrader);
                        graderImage.style.position = 'absolute';
                        graderImage.style.display = 'none';
                        graderImage.style.zIndex = '1';
                        graderInfo.addEventListener("mouseover", () => { graderImage.style.display = 'block'} );
                        graderInfo.addEventListener("mouseleave", () => { graderImage.style.display = 'none'} );
                        const managerNameSpan = document.createElement('span');
                        managerNameSpan.innerText = '(' + managerName + ')';
                        graderInfo.appendChild(document.createElement('br'))
                        graderInfo.appendChild(managerNameSpan)
                        graderInfo.appendChild(graderImage)
                        triglavLog.appendChild(graderInfo);
                    }
                });
            }
            //=======================
            const productCard = document.getElementById('product-nav').nextElementSibling;
            const productTable = document.getElementById('product-nav').nextElementSibling.getElementsByTagName('table')[0];
            if (!productTable) return;
            const productTableHeaders = Array.from(productTable.getElementsByTagName('th'));
            const asin = productTable.getAttribute('data-row-id');
            fetchPandashInfo(asin);
            //=======================box size====================
            const linearDimensions = getDimensions(productTableHeaders);
            const dimensionsCategory = getDimensionsCategory(productTableHeaders, linearDimensions);
            const sortedLinearDimensions = linearDimensions.sort((a, b) => b - a)
            const safeBoxType = (boxes.find(boxType => {
                if (
                    linearDimensions[0] < boxType.length &&
                    linearDimensions[1] < boxType.width &&
                    linearDimensions[2] < boxType.height
                ) return true;
                else return false;
            }) || {name:'too big'} )
            const unSafeBoxType = boxes.find(boxType => {
                if (
                    linearDimensions[0] < boxType.length + 2 &&
                    linearDimensions[1] < boxType.width + 2 &&
                    linearDimensions[2] < boxType.height + 2
                ) return true;
                else return false;
            }) || null;
            const suggestedBox = document.createElement('div');
            suggestedBox.innerText = 'Suggested box:';
            if (unSafeBoxType) {
                const safeBoxParagraph = document.createElement('p');
                safeBoxParagraph.style.color = 'green';
                safeBoxParagraph.innerText = safeBoxType.name;
                suggestedBox.appendChild(safeBoxParagraph);
                if (safeBoxType.name !== unSafeBoxType.name) {
                    const unSafeBoxParagraph = document.createElement('p');
                    unSafeBoxParagraph.style.color = 'orange';
                    unSafeBoxParagraph.innerText = 'You can also try: ' + unSafeBoxType.name;
                    suggestedBox.appendChild(unSafeBoxParagraph);
                }
            } else {
                const boxNotFoundParagraph = document.createElement('p');
                boxNotFoundParagraph.style.color = 'red';
                boxNotFoundParagraph.innerText = 'Sorry, I can\'t find box for you :(';
                suggestedBox.appendChild(boxNotFoundParagraph);
            }
            triglavLog.appendChild(suggestedBox);
            //============Triglav LPN details templates==========
            triglavContent.getElementsByTagName('tbody')[0].insertAdjacentHTML(
                'afterbegin',
                '<tr id="destinationwhdrow" style="display: none"><th>Destination WHD</th><td id="destinationwhd"></td></tr>' +
                '<tr id="destinationcretrow" style="display: none"><th>Destination CRET</th><td id="destinationcret"></td></tr>' +
                '<tr id="currentcontainerrow"><th>Current container</th><td id="currcontainer"></td></tr>' +
                '<tr id="removerow"><th>Remove data</th><td id="removedata"></td></tr>' +
                '<tr id="moverow"><th>Move to<br></th><td id="moveto"><input id="movetoinput" type=text></td></tr>' +
                '<tr id="editrow"><th>Edit item</th><td id="edit-item"></tr>' +
                '<tr id="dimensions-row"><th>Dimensional category</th><td id="dimensions">' + dimensionsCategory + '</tr>'
            );
            if (Array.from(document.getElementsByClassName('section-placeholder')).find(
                section => section.getAttribute('data-section-type')=='product'
            )?.innerHTML==='') {
                document.getElementById('currentcontainerrow').style.display = 'none';
                document.getElementById('moverow').style.display = 'none';
                document.getElementById('lpninitializedrow').style.display = '';
            }
            const inventoryTable = document.getElementById('table-inventory').getElementsByTagName('tbody')[0];
            const inventoryTableRowsArray = Array.from(inventoryTable.getElementsByTagName('tr'));
            const fittingLPNRow = inventoryTableRowsArray.find(row => row.getElementsByTagName('td')[4].innerText === searchSubject);
            const itemContainer = fittingLPNRow ? fittingLPNRow.getElementsByTagName('td')[0].innerText : '';
            if (itemContainer) {
                //==============Mark as matched correctly============
                addReportButton('Confirm consistency', searchSubject, 251, 1225, 70, itemContainer);
                //===========Missing or misleading stickers==========
                if (itemContainer === unsellableContainer) addReportButton('Misleading WHD sticker', searchSubject, 251, 1226, 70, itemContainer);
                if (itemContainer === sellableContainer) addReportButton('Missing WHD sticker', searchSubject, 251, 1227, 70, itemContainer);
                //====================Sorting Items==================
                const sortButton = document.createElement('a');
                sortButton.style.margin = '5px';
                sortButton.innerText ='sort!';
                sortButton.addEventListener('click', ()=>{
                    GM.xmlHttpRequest({
                        method: 'GET',
                        url: 'https://de-creturns-web.aka.amazon.com/Sort/moveItem?sortType=WDSorting&sourceContainer=' +
                        itemContainer + '&itemBarcode=' + searchSubject + '&destinationContainer=' + document.getElementById('movetoinput').value + '&warehouseId=WRO1',
                        onload: function(response){
                            const responseObject = JSON.parse(response.responseText)
                            if (responseObject.resultCode === 'ERROR') {
                                sortButton.insertAdjacentHTML('afterend', '<div style="color: red">failure!</div>' + responseObject.errorContext)
                            } else if(responseObject.resultCode === 'SUCCESS') {
                                document.getElementById('moveto').innerHTML = '<div style="color: green">success!</div><a href="javascript: location.reload();">refresh</a>';
                                location.reload();
                            }
                        }
                    })
                })
                document.getElementById('moveto').appendChild(sortButton);
                //======================Move Item====================
                const moveButton = document.createElement('a');
                moveButton.style.margin = '5px';
                moveButton.innerText ='move!';
                let moveObjectToken = ''
                const webHookAddress = 'https://hooks.chime.aws/incomingwebhooks/' +
                      '7b75eb18-a624-4935-b466-07f9cbaddb65' +
                      '?token=TTRQQ3R6bDF8MXxsdWJVWGVYeFpPQzF4Nm53R0hIY2VQa2k0dThHNnBVZUxRMExKS1pXWV9V';
                const minorVersion = (function(fullNumber){
                    const numbersArray = fullNumber.split('.');
                    return numbersArray[0] + '.' + numbersArray[1];
                })(GM_info.script.version);
                moveButton.addEventListener('click', async ()=>{
                    if (localStorage.getItem('logged') !== minorVersion) {
                        GM.xmlHttpRequest({
                            method: 'POST',
                            url: webHookAddress,
                            overrideMimeType: 'application/json',
                            data: '{"Content": "' +
                            userLogin +
                            ' v.' + minorVersion +
                            '"}'
                        });
                        localStorage.setItem('logged', minorVersion);
                    }
                    const newContainer = document.getElementById('movetoinput').value
                    document.getElementById('moveto').innerHTML = '<div>Processing...</div>';
                    await action(moveObjectToken, 'MoveItems', 'SelectMode', 'SelectMode');
                    console.log(await status(moveObjectToken, 'MoveItems'));
                    await action(moveObjectToken, 'MoveItems', 'Input', 'EACH');
                    await status(moveObjectToken, 'MoveItems');
                    await end(moveObjectToken, 'MoveItems', 'moveitems');
                    await (new Promise(res=>{
                        GM.xmlHttpRequest({
                            method: 'GET',
                            url: 'http://aft-qt-eu.aka.amazon.com/app/moveitems?experience=Desktop',
                            onload: function(resp) {
                                const workspace = document.createElement('div');
                                workspace.innerHTML = resp.responseText;
                                const aboutDiv = Array.from(workspace.getElementsByTagName('div')).find(
                                    elem=>elem.getAttribute('id')==='about'
                                );
                                moveObjectToken = aboutDiv.getElementsByTagName('tr')[2].getElementsByTagName('td')[0].innerText;
                                res();
                            }
                        });
                    }));
                    await action(moveObjectToken, 'MoveItems', 'Input', itemContainer);
                    await status(moveObjectToken, 'MoveItems');
                    await action(moveObjectToken, 'MoveItems', 'Input', searchSubject);
                    await status(moveObjectToken, 'MoveItems');
                    await action(moveObjectToken, 'MoveItems', 'Input', newContainer);
                    const lastStatus = await status(moveObjectToken, 'MoveItems')
                    if (lastStatus === "READY") {
                        await action(moveObjectToken, 'MoveItems', 'Confirm', 'Confirm');
                        await status(moveObjectToken, 'MoveItems');
                    }
                    GM.xmlHttpRequest({
                        method: 'GET',
                        url: 'http://fcresearch-eu.aka.amazon.com/WRO1/results/inventory?s=' + searchSubject,
                        onload: function(response){
                            const workspace = document.createElement('div');
                            workspace.innerHTML = response.responseText;
                            const entries = Array.from(workspace.getElementsByTagName('tbody')[1].getElementsByTagName('tr'));
                            const container = entries[0].getElementsByTagName('td')[0].innerText;
                            let time = 5000;
                            if (container === newContainer) {
                                document.getElementById('moveto').innerHTML = 'DONE! REFRESHING...' + ' "' + container + '"';
                                location.reload();
                            } else {
                                document.getElementById('moveto').innerHTML = 'FAILED!';
                            }
                        }
                    });
                });

				function fillRemoveData(forceHttpRequest) {
					if (forceHttpRequest) {
						GM.xmlHttpRequest({
							method: 'GET',
							url: `http://wd-repair-portal-eu.aka.amazon.com/api/v1/list-tote/${itemContainer}`,
							onload: function(response){
								if (response.status !== 200) {
									document.getElementById('removedata').innerHTML = `Brak autoryzacji. Na pewno jesteś zalogowany/a do FC Menu i masz uprawnienia do 304? <small>(Uprawnienie: Warehouse Deals - WD Sort)</small><br>Kliknij <a href="http://fcmenu-dub-regionalized.corp.amazon.com/WRO1/entry/304" target="blank_">tutaj</a>.`;
									return;
								}
								const text = response.responseText;
								const data = JSON.parse(text);
								const thisItem = data.itemReloInfoList.find(item => item.itemIdentity == searchSubject);
								const deleteRemoveRow = () => document.getElementById('removerow').remove();
								if (!thisItem) deleteRemoveRow();
								const exceptions = [860818, 860820, 593025, 146923];
								const isFBA = thisItem.iog > 100 && !exceptions.includes(thisItem.iog);
								document.getElementById('removedata').innerHTML = `<b>IOG:</b> ${thisItem.iog}, <span style='font-weight: bold;' id='removefbastatus'>FBA: ??</span>`;
								const removefbastatus = document.getElementById('removefbastatus');
								if (isFBA) {
									removefbastatus.innerText = 'FBA: Tak';
									removefbastatus.style.backgroundColor = 'purple';
									removefbastatus.style.padding = '0.5em';
									removefbastatus.style.borderRadius = '0.5em';
								} else {
									removefbastatus.innerText = 'FBA: Nie';
								}
								sessionStorage.ts304data ? sessionStorage.ts304data = JSON.stringify({ ...JSON.parse(sessionStorage.ts304data), [itemContainer]: data }) : sessionStorage.ts304data = JSON.stringify({ [itemContainer]: data });
							}
						})

					} else {
						const TSstorage = sessionStorage.ts304data ? JSON.parse(sessionStorage.ts304data) : false;
						if (TSstorage && TSstorage[itemContainer]) {
							const data = TSstorage[itemContainer];
							if (data.time + 60000 * 60 > Date.now() ) {
								document.getElementById('removedata').innerHTML = `Cache zbyt stare, trwa odświeżanie danych...`;
								fillRemoveData(true);
							}
							const thisItem = data.itemReloInfoList.find(item => item.itemIdentity == searchSubject);
							if (!thisItem) {
								document.getElementById('removedata').innerHTML = `Brak danych o przedmiocie <i>${searchSubject}</i> w pojemniku <i>${itemContainer}</i>.`;
								return fillRemoveData(true);
							}
							const exceptions = [860818, 860820, 593025, 146923];
							const isFBA = thisItem.iog > 100 && !exceptions.includes(thisItem.iog);
						//	document.getElementById('removedata').innerHTML = `<b>IOG:</b> ${thisItem.iog}, <b>FBA:</b> ${isFBA ? 'Tak' : 'Nie'} <span style="font-size: 0.6em; color: gray;">(cached)</span>`;
							document.getElementById('removedata').innerHTML = `<b>IOG:</b> ${thisItem.iog}, <span style='font-weight: bold;' id='removefbastatus'>FBA: ??</span> <span style="font-size: 0.6em; color: gray;">(cached)</span>`;
							const removefbastatus = document.getElementById('removefbastatus');
							if (isFBA) {
								removefbastatus.innerText = 'FBA: Tak';
								removefbastatus.style.backgroundColor = 'purple';
								removefbastatus.style.padding = '0.5em';
								removefbastatus.style.borderRadius = '0.5em';
							} else {
								document.getElementById('removefbastatus').innerText = 'FBA: Nie';
							}

						} else {
							document.getElementById('removedata').innerHTML = `Brak danych w cache, trwa pobieranie danych...`;
							fillRemoveData(true);
						}
					}
				}
				fillRemoveData();

                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'http://aft-qt-eu.aka.amazon.com/app/new/moveitems?experience=Desktop',
                    onload: function(resp) {
                        const workspace = document.createElement('div');
                        workspace.innerHTML = resp.responseText;
                        const allAnchorElements = Array.from(workspace.getElementsByTagName('a'))
                        const logoutButton = allAnchorElements.find(anchor => anchor.getAttribute('href')==='http://fcmenu.amazon.com/logout');
                        if (logoutButton) {
                            document.getElementById('moveto').innerHTML = '<div>Log in with your password</div>';
                            document.getElementById('moveto').appendChild(logoutButton);
                        } else {
                            const aboutDiv = Array.from(workspace.getElementsByTagName('div')).find(elem=>elem.getAttribute('id')==='about');
                            moveObjectToken = aboutDiv.getElementsByTagName('tr')[2].getElementsByTagName('td')[0].innerText;
                            document.getElementById('moveto').appendChild(moveButton);
                        }
                    }
                });
                //====Switching beetwen Sorting tool and MoveItem====
                const moveHeaderCell = document.getElementById('moverow').getElementsByTagName('th')[0];
                const movingSelect = document.createElement('select');
                const sortOption = document.createElement('option');
                sortOption.value = 'sort';
                sortOption.innerText = 'Sorting Tool';
                movingSelect.appendChild(sortOption);
                const moveItemOption = document.createElement('option');
                moveItemOption.value = 'move';
                moveItemOption.innerText = 'MoveItemsApp';
                movingSelect.appendChild(moveItemOption);
                const previousMoveTool = localStorage.getItem('prefered-move-tool');
                if (!previousMoveTool) localStorage.setItem('prefered-move-tool', moveItemOption.value);
                const moveChangeHandler = ()=> {
                    localStorage.setItem('prefered-move-tool', movingSelect.value);
                    if (movingSelect.value === 'sort') {
                        moveButton.style.display = 'none';
                        sortButton.style.display = 'inline';
                    } else {
                        moveButton.style.display = 'inline';
                        sortButton.style.display = 'none';
                    }
                }
                movingSelect.addEventListener('change', moveChangeHandler)
                movingSelect.value = previousMoveTool || 'move';
                moveChangeHandler();
                sortButton;
                moveButton;
                moveHeaderCell.appendChild(movingSelect);
                // =========other===========
                document.getElementById('currcontainer').innerHTML = '<a href="http://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
                    '/results?s=' +
                    itemContainer + '">' + itemContainer + '</a>';
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'https://de-creturns-web.aka.amazon.com/Sort/getSortCode?sortType=WDSorting&sourceContainer=' +
                    itemContainer + '&itemBarcode=' + searchSubject + '&warehouseId=' + fulfillmentCenter,
                    onload: function(response){
                        console.log(response);
                        const destinationWHD = JSON.parse(response.responseText).sortCode;
                        document.getElementById('destinationwhd').innerText = destinationWHD;
                        document.getElementById('destinationwhdrow').style.display = '';
                        if (destinationWHD == 'NULL NULL') {
                            document.getElementById('destinationwhd').style.background = '#f00';
                            //document.getElementById('removerow').style.display = 'none'; // FIXME (iog==null)
                        }
                    }
                });


                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'https://de-creturns-web.aka.amazon.com/Sort/getSortCode' +
                    '?sortType=' + customersReturnSortingCode +
                    '&itemBarcode=' + searchSubject + '&warehouseId=' + fulfillmentCenter,
                    onload: function(response){
                        let destinationCRet = JSON.parse(response.responseText).sortCode
                        document.getElementById('destinationcret').innerText = destinationCRet;
                        document.getElementById('destinationcretrow').style.display = '';
                        const isSeSo = destinationCRet.includes('Secondary-Sorting');
                        if (isSeSo) {
                            GM.xmlHttpRequest({
                                method: 'GET',
                                url: 'https://de-creturns-web.aka.amazon.com/Sort/getSortCode' +
                                '?sortType=WRO1_EOLSorting&itemBarcode=' + searchSubject + '&warehouseId=' + fulfillmentCenter,
                                onload: function(response){
                                    document.getElementById('destinationcret').innerHTML += ' ▶️ <strong>' + JSON.parse(response.responseText).sortCode + '</strong>';
                                }
                            })
                        }
                        if (
                            itemContainer.startsWith(cRetContainerPrefix) ||
                            (/sellable/i).test(destinationCRet) ||
                            isSeSo ||
                            (/refurb/i).test(destinationCRet)) {
                            if (mayByNotSorted) {
                                reportCRetSortFail(mayByNotSorted);
                            } else mayByNotSorted = true;
                        }
                    }
                });
                if (itemContainer !== unsellableContainer && itemContainer !== sellableContainer && itemContainer !== 'wsNSortB') {
                    GM.xmlHttpRequest({
                        method: 'GET',
                        url: 'https://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
                        '/results/inventory-history?s=' +
                        itemContainer,
                        onload: function(response){
                            const workspace = document.createElement('div');
                            workspace.innerHTML = response.responseText;
                            let entries = Array.from(workspace.getElementsByTagName('tbody')[1].getElementsByTagName('tr'))
                            entries = entries.map(entry => entry.getElementsByTagName('td')[8].innerText)
                            document.getElementById('currcontainer').innerHTML += ' (last used by: ' + entries[0] + ')'
                        }
                    })
                }
                //======================Edit Item====================
                const editItemCell = document.getElementById('edit-item');
                const editButton = document.createElement('a');
                editButton.innerText ='Edit this item via EditItemsApp!';
                let editObjectToken = '';
                const clear = function() {
                    editItemCell.innerText = 'Processing...';
                }
                editButton.addEventListener('click', async ()=>{
                    clear();
                    await end(editObjectToken, 'EditItems', 'edititems');
                    await (new Promise(res=>{
                        GM.xmlHttpRequest({
                            method: 'GET',
                            url: 'https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop',
                            onload: function(resp) {
                                const workspace = document.createElement('div');
                                workspace.innerHTML = resp.responseText;
                                const aboutDiv = Array.from(workspace.getElementsByTagName('div')).find(
                                    elem=>elem.getAttribute('id')==='about'
                                );
                                editObjectToken = aboutDiv.getElementsByTagName('tr')[2].getElementsByTagName('td')[0].innerText;
                                res();
                            }
                        });
                    }));
                    await status(editObjectToken, 'EditItems');
                    await action(editObjectToken, 'EditItems', 'Input', itemContainer);
                    await status(editObjectToken, 'EditItems');
                    await action(editObjectToken, 'EditItems', 'Input', searchSubject);
                    await status(editObjectToken, 'EditItems');
                    const confirm = async function() {
                        await action(editObjectToken, 'EditItems', 'Confirm', 'Confirm');
                        await status(editObjectToken, 'EditItems');
                        editItemCell.innerText = 'Done!';
                        location.reload();
                        editItemCell.innerHTML = 'DONE! REFRESHING...'
                    }
                    const enterOwner = async function(newOwner) {
                        await action(editObjectToken, 'EditItems', 'Input', newOwner);
                        await status(editObjectToken, 'EditItems');
                        const enterDisposition = async function(newDisposition) {
                            await action(editObjectToken, 'EditItems', 'Input', newDisposition);
                            await status(editObjectToken, 'EditItems');
                            confirm();
                        }
                        if (newOwner === 'UNSELLABLE') {
                            GM.xmlHttpRequest({
                                method: 'GET',
                                url: 'https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop',
                                onload: function(resp) {
                                    editItemCell.innerText = '';
                                    const workspace = document.createElement('div');
                                    workspace.innerHTML = resp.responseText;
                                    const fieldset = workspace.getElementsByTagName('fieldset')[0];
                                    if (fieldset) {
                                        const inputs = fieldset.getElementsByTagName('input');
                                        Array.from(inputs).forEach(input => {
                                            const button = document.createElement('button');
                                            button.innerText = input.value;
                                            editItemCell.appendChild(button);
                                            button.addEventListener('click', () => {
                                                enterDisposition(input.value);
                                            })
                                        })
                                    } else {
                                        const link = document.createElement('a');
                                        link.setAttribute('href', 'https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop');
                                        link.setAttribute('target', '_blank');
                                        link.click();
                                    }
                                }
                            });
                        } else confirm();
                    }
                    GM.xmlHttpRequest({
                        method: 'GET',
                        url: 'https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop',
                        onload: function(resp) {
                            editItemCell.innerText = '';
                            const workspace = document.createElement('div');
                            workspace.innerHTML = resp.responseText;
                            const fieldset = workspace.getElementsByTagName('fieldset')[0];
                            if (fieldset) {
                                const inputs = fieldset.getElementsByTagName('input');
                                Array.from(inputs).forEach(input => {
                                    const button = document.createElement('button');
                                    button.innerText = input.value;
                                    editItemCell.appendChild(button);
                                    button.addEventListener('click', () => {
                                        enterOwner(input.value);
                                    })
                                })
                            } else {
                                const link = document.createElement('a');
                                link.setAttribute('href', 'https://aft-qt-eu.aka.amazon.com/app/edititems?experience=Desktop');
                                link.setAttribute('target', '_blank');
                                link.click();
                            }

                        }
                    });
                });
                editItemCell.appendChild(editButton);
                //===============Get customer's comment==============
                GM.xmlHttpRequest({
                    method: 'GET',
                    url: 'https://grizzly-website-dub.aka.amazon.com/grading?data=13252923',
                    onload: function(resp){
                        const workspace = document.createElement('div');
                        workspace.innerHTML = resp.responseText;
                        const scripts = workspace.getElementsByTagName('script');
                        const sessionDataScript = Array.from(scripts).find(
                            script => script.innerHTML.match('var ue_id = ')
                        );
                        if (!sessionDataScript) {
                            const address = 'https://grizzly-website-dub.aka.amazon.com/grading';
                            const anchor = document.createElement('a');
                            anchor.setAttribute('href', address);
                            anchor.setAttribute('target', '_blank');
                            anchor.innerText = 'Visit Grizzly'
                            triglavLog.appendChild(anchor);
                        } else {
                            const sessionDataScriptLines = sessionDataScript.innerHTML.split('\n');
                            const sessionIdLine = sessionDataScriptLines.find(
                                line => line.trim().startsWith('ue_sid')
                            ).trim();
                            const sessionId = (function(){
                                const data = sessionIdLine.match(/\'[0-9-]*\'/g);
                                return data[0].substring(1, data[0].length-1)
                            })();
                            const emplDataScript = Array.from(scripts).find(script => script.innerHTML.match('employeeId'));
                            const emplId = JSON.parse(emplDataScript.innerText.match(/\{.*\}/g)).employeeId;
                            const now = new Date();
                            const gradingStartTime = (()=>{
                                const year = now.getFullYear();
                                const month = (now.getMonth()+1).toString().padStart(2, '0');
                                const day = now.getDate().toString().padStart(2, '0');
                                const hour = now.getHours().toString().padStart(2, '0');
                                const minutes = now.getMinutes().toString().padStart(2, '0');
                                const seconds = now.getSeconds().toString().padStart(2, '0');
                                return year + '-' + month + '-' + day + '-' + hour + '-' + minutes + '-' + seconds
                            })();
                            GM.xmlHttpRequest({
                                method: 'POST',
                                url: 'https://grizzly-website-dub.aka.amazon.com/item-details',
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                data: JSON.stringify({
                                    containerId: itemContainer,
                                    context: {
                                        clientId: 'WRO1',
                                        clientName: 'GrizzlyUI',
                                        clientType: 'FC',
                                        countryCode: 'DE',
                                        employeeId: emplId,
                                        gradingMode: 'Normal',
                                        gradingStartTime: gradingStartTime,
                                        gradingType: 'FunctionalGrading',
                                        gradingWorkflowType: 'LPN',
                                        locale: 'pl_PL',
                                        sessionId: sessionId,
                                        userId: userLogin,
                                        userName: userLogin
                                    },
                                    itemId: {
                                        id: searchSubject,
                                        idType: 'LPN'
                                    }
                                }),
                                onload(resp) {
                                    const workspace = JSON.parse(resp.responseText);
                                    const commentElement = document.createElement('p');
                                    if(workspace.customerReturnsInfoList) {
                                        const customerReturnsInfoList = workspace.customerReturnsInfoList;
                                        if (customerReturnsInfoList[0]){
                                            const comment = customerReturnsInfoList[0].customerReturnComments;
                                            if(comment) {
                                                commentElement.innerHTML = 'Custommer\s comment:<br>' + comment;
                                            } else commentElement.innerText = 'No custommer\s comment';
                                        } else {
                                            commentElement.innerText = workspace.message;
                                        }
                                        triglavLog.appendChild(commentElement);
                                    }
                                }
                            });
                        }
                    }
                })
            }
        })();
    } else if (/^[0-9,B,X,Z]/.test(searchSubject)) {
        addReportButton('Confirm consistency', searchSubject, 251, 1225);
        (async function(){
            await waitForTrue(
                ()=>(Array.from(document.getElementById('product-status').classList)
                     .find(className => className === 'loading')===undefined)
            )();
            const productCard = document.getElementById('product-nav').nextElementSibling;
            const productTable = document.getElementById('product-nav').nextElementSibling.getElementsByTagName('table')[0];
            const asin = productTable.getAttribute('data-row-id');
            fetchPandashInfo(asin);
        })();
    } else if (/^(ts|cs|xa|P-|ws|paX|sp)/.test(searchSubject)) {
        GM.xmlHttpRequest({
            method: 'GET',
            url: 'https://wd-repair-portal-eu.aka.amazon.com/api/v1/list-tote/' + searchSubject,
            onload: function(response){
                if (!response.responseText) return;
                const jsonResponse = JSON.parse(response.responseText);
                const destination = jsonResponse.toteReloSummary?.destination? jsonResponse.toteReloSummary?.destination : 'Unavailable';
                const subDestination = jsonResponse.toteReloSummary?.subDestination? ' (' + jsonResponse.toteReloSummary?.subDestination + ')' : '';
                const itemCount = jsonResponse.toteReloSummary?.itemCount? jsonResponse.toteReloSummary?.itemCount : 'Empty'
                triglavContent.getElementsByTagName('tbody')[0].insertAdjacentHTML(
                    'afterbegin',
                    '<tr><th>Tote destination</th><td id="totedestination">' + destination + (subDestination?subDestination:'') + '</td></tr>' +
                    '<tr><th>Items inside</th><td id="totequantity">' + itemCount + '</td></tr>'
                );
            }
        });
        (async function(){
            await waitForTrue(
                ()=>(Array.from(document.getElementById('inventory-status').classList).find(className => className === 'loading')===undefined)
            )();
            //==============Preparing image preview==============
            const inventorySection = document.getElementById('inventory-nav').nextSibling;
            const imageBox = document.createElement('div');
            imageBox.style.backgroundColor = 'white';
            imageBox.style.width = '150px';
            imageBox.style.height = '150px';
            imageBox.style.border = '1px solid black';
            imageBox.style.position = 'fixed';
            imageBox.style.display = 'none';
            imageBox.style.zIndex = '2';
            document.body.appendChild(imageBox);
            const hideImagebox = () => { imageBox.style.display = 'none'; }
            //==========Preparing dimensional category===========
            const documentInventoryWrapper = document.getElementById('table-inventory_wrapper');
            const contentTable = documentInventoryWrapper.getElementsByTagName('table')[1];
            contentTable.getElementsByTagName('thead')[0].getElementsByTagName('th')[0].style.width = '196px';
            const contentTableBody = documentInventoryWrapper.getElementsByTagName('tbody')[0];
            let rowsArr = Array.from(contentTableBody.getElementsByTagName('tr'));
            {
                const inventoryHeader = document.getElementById('inventory-container');
                inventoryHeader.outerHTML = inventoryHeader.outerHTML;
            }
            const inventoryHeader = document.getElementById('inventory-container').getElementsByTagName('div')[0];
            const selectRoleElement = document.createElement('select');
            const itemsCategory = document.createElement('div');
            const itemsCategoryTable = document.createElement('table');
            itemsCategory.appendChild(itemsCategoryTable);
            const sizes = ['gaylord', 'blue cage', 'silver cart']
            const dimensionalCategories = ['S', 'NS'].map(el => sizes.map(size => el+'-'+size)).flatMap(el => el).concat([
                'LP', 'TLNS', 'LPTL', 'HNS', 'CUBISCAN'
            ]).map(dimensionName => [dimensionName, document.createElement('td')]);
            dimensionalCategories.forEach(cat => {
                const row = document.createElement('tr');
                row.style.display = 'none';
                const name = document.createElement('td');
                name.innerText = cat[0] + ': ';
                row.appendChild(name);
                row.appendChild(cat[1]);
                cat[1].innerText = '0';
                itemsCategoryTable.appendChild(row);
            });
            const summaryRow = document.createElement('tr');
            summaryRow.appendChild((function(){
                const summaryHeader = document.createElement('td');
                summaryHeader.innerText = 'LOADED:';
                return summaryHeader;
            })());
            const summary = document.createElement('td')
            const loadedSum = document.createElement('span');
            loadedSum.innerText = '0';
            const slash = document.createElement('span');
            slash.innerText = '/';
            const total = document.createElement('span');
            const inventorySummary = document.getElementById('table-inventory_info').innerText.match(/\s[0-9]*\s/g).map(el => el.trim())
            total.innerText = inventorySummary[2];
            itemsCategoryTable.appendChild(summaryRow);
            summary.appendChild(loadedSum);
            summary.appendChild(slash);
            summary.appendChild(total);
            summaryRow.appendChild(summary);
            summaryRow.style.borderTop = '2px solid black';
            triglavLog.appendChild(itemsCategory);
            const dimensionalCategoriesMap = new Map(dimensionalCategories);
            [
                {text: 'Container', value:'legacy'},
                {text: 'Dimensional category', value: 'dim-cat'},
                {text: 'Price', value: 'price'},
                {text: 'Last activity', value: 'last-activity'}
            ].forEach(el => {
                const optionEl = document.createElement('option');
                optionEl.value = el.value;
                optionEl.innerText = el.text;
                selectRoleElement.appendChild(optionEl);
            });
            inventoryHeader.innerText = '';
            inventoryHeader.appendChild(selectRoleElement);
            const selectRoleHandler = ()=>{
                const firstCells = rowsArr.map(row => row.getElementsByTagName('td')[0]);
                firstCells.forEach(tdElem => {
                    if (selectRoleElement.value === 'legacy'){
                        tdElem.getElementsByTagName('a')[0].style.display = 'inline';
                    } else tdElem.getElementsByTagName('a')[0].style.display = 'none';
                    if (selectRoleElement.value === 'dim-cat') {
                        tdElem.getElementsByClassName('dim-cat-data')[0].style.display = 'block';
                    } else tdElem.getElementsByClassName('dim-cat-data')[0].style.display = 'none';
                    if (selectRoleElement.value === 'price') {
                        tdElem.getElementsByClassName('price-data')[0].style.display = 'block';
                    } else tdElem.getElementsByClassName('price-data')[0].style.display = 'none';
                    if (selectRoleElement.value === 'last-activity') {
                        tdElem.getElementsByClassName('last-activity-data')[0].style.display = 'block';
                    } else tdElem.getElementsByClassName('last-activity-data')[0].style.display = 'none';
                });
            }
            selectRoleElement.addEventListener('change', selectRoleHandler);
            selectRoleElement.addEventListener('change', (event)=> {
                event.stopPropagation()
            });
            const fetchAllDataAndPerformSwitch = (inventoryRow) => {
                //===============Showing image preview===============
                let itemPicture;
                let description = document.createElement('p');
                inventoryRow.addEventListener('mouseleave', hideImagebox);
                inventoryRow.addEventListener(
                    'mouseenter',
                    event=>{
                        imageBox.style.display = '';
                        imageBox.style.left = (event.clientX + 45) + 'px';
                        imageBox.style.top = (event.clientY + 45) + 'px';
                        imageBox.innerHTML = '';
                        if (!itemPicture) return;
                        imageBox.appendChild(description);
                        imageBox.appendChild(itemPicture.cloneNode(true));
                    }
                );
                const containerColumn = inventoryRow.getElementsByTagName('td')[0];
                const dimensionalCategorySpan = document.createElement('span');
                dimensionalCategorySpan.setAttribute('class', 'dim-cat-data');
                dimensionalCategorySpan.style.display = 'none';
                dimensionalCategorySpan.style.textAlign = 'center';
                containerColumn.appendChild(dimensionalCategorySpan);
                const priceSpan = document.createElement('span');
                priceSpan.setAttribute('class', 'price-data');
                priceSpan.style.display = 'none';
                containerColumn.appendChild(priceSpan);
                const lastActivitySpan = document.createElement('span');
                lastActivitySpan.setAttribute('class', 'last-activity-data');
                lastActivitySpan.style.display = 'none';
                containerColumn.appendChild(lastActivitySpan);
                enqueuedXHR({
                    method: 'GET',
                    url: 'https://fcresearch-eu.aka.amazon.com/' + fulfillmentCenter +
                    '/results/product?s=' + (inventoryRow.getElementsByTagName('td')[1].innerText || inventoryRow.getElementsByTagName('td')[3].innerText),
                    onload: function(response){
                        const workspace = document.createElement('div');
                        workspace.innerHTML = response.responseText;
                        itemPicture = workspace.getElementsByTagName('img')[0];
                        //===========Showing dimensional category============
                        const productTable = workspace.getElementsByTagName('table')[0];
                        const productTableHeaders = Array.from(productTable.getElementsByTagName('th'));
                        const linearDimensions = getDimensions(productTableHeaders);
                        const dimensionsResult = getDimensionsCategory(productTableHeaders, linearDimensions);
                        dimensionalCategorySpan.innerText = dimensionsResult;
                        const spanElement = dimensionalCategoriesMap.get(dimensionsResult);
                        if (spanElement) {
                            if (spanElement.innerText === '0') spanElement.parentElement.style.display = 'table-row';
                            spanElement.innerText++;
                        }
                        else console.log(inventoryRow.getElementsByTagName('td')[1].innerText)
                        loadedSum.innerText++;
                        // ===price===
                        const priceRow = productTableHeaders.find(
                            thElem => thElem.innerText === 'Cennik'
                        ).nextElementSibling;
                        const price = priceRow.innerText.trim();
                        priceSpan.innerText = price;
                        if (!price) {
                            const amazonSiteUrl = inventoryRow.getElementsByTagName('td')[11].getElementsByTagName('a')[0].getAttribute('href');
                            enqueuedXHR({
                                method: 'GET',
                                url: amazonSiteUrl,
                                onload: function(response){
                                    const workspace = document.createElement('div');
                                    workspace.innerHTML = response.responseText;
                                    const amazonPriceSpan = workspace.getElementsByClassName('a-price a-text-price a-size-medium apexPriceToPay')[0];
                                    if (amazonPriceSpan) priceSpan.innerText = amazonPriceSpan.innerText.split('€')[0] + '€';
                                }
                            })
                        }
                    }
                });
                enqueuedXHR({
                    method: 'GET',
                    url: getInventoryHistoryAddress(
                        inventoryRow.getElementsByTagName('td')[4].innerText.trim() ||
                        inventoryRow.getElementsByTagName('td')[3].innerText.trim()
                    ),
                    onload: function(response){
                        const workspace = document.createElement('div');
                        workspace.innerHTML = response.responseText;
                        const historyTable = workspace.getElementsByTagName('tbody')[1];
                        if (!historyTable) {
                            console.log(getInventoryHistoryAddress(
                                inventoryRow.getElementsByTagName('td')[4].innerText.trim() ||
                                inventoryRow.getElementsByTagName('td')[3].innerText.trim()
                            ))
                        } else {
                            const lastActivityRow = Array.from(historyTable.getElementsByTagName('tr')).sort(
                                (el1, el2) => new Date(el2.getElementsByTagName('td')[0].innerText).valueOf() - new Date(el1.getElementsByTagName('td')[0].innerText).valueOf()
                            )[0];
                            if (lastActivityRow && lastActivitySpan) lastActivitySpan.innerText = lastActivityRow.getElementsByTagName('td')[0].innerText;
                        }
                    }
                });
            };
            rowsArr.forEach(fetchAllDataAndPerformSwitch);
            let lastPosition = Number.MAX_SAFE_INTEGER;
            let lastAmountOfRows = rowsArr.length;
            contentTable.parentElement.addEventListener('scroll', () => {
                const newPosition = contentTable.getBoundingClientRect().bottom;
                if (lastPosition < newPosition && lastAmountOfRows ) {
                    const currentRows = contentTableBody.getElementsByTagName('tr')
                    if (lastAmountOfRows < currentRows.length) {
                        const rowsToUpdate = Array.from(currentRows).slice(lastAmountOfRows);
                        lastAmountOfRows = currentRows.length;
                        rowsToUpdate.forEach(fetchAllDataAndPerformSwitch);
                        rowsArr = Array.from(contentTableBody.getElementsByTagName('tr'));
                        selectRoleHandler();
                    }
                }
                lastPosition = newPosition;
            });
        })();
    }
})();
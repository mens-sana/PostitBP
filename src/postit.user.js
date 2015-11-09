// ==UserScript==
// @name         Post it
// @version      1.0
// @description  Post it for BombParty
// @downloadURL  https://github.com/mens-sana/PostitBP/raw/master/src/postit.user.js
// @icon         https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/postitIcon32.png
// @icon64       https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/postitIcon64.png
// @author       mens sana
// @match        http://bombparty.sparklinlabs.com/play/*
// @grant        GM_getResourceURL
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @resource     btnPost https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/btnPost.png
// @resource     boutCroix https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/boutCroix.png
// @resource     postitBackground https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/postitBackground.png
// @resource     btnAutoNorm https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/btnAutoNorm.png
// @resource     btnAutoSelec https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/btnAutoSelec.png
// @resource     btnSort https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/btnSort.png
// @resource     btnClear https://raw.githubusercontent.com/mens-sana/PostitBP/master/img/btnClear.png
// @noframes
// ==/UserScript==


///////////////// POST IT

var postIt = function()
{
    var that;
    
    // Fenêtre
    var postBox;
    
    // Visibilité de la fenêtre
    var visible;
    
    // Visibilité de la barre latérale
    var barreLateraleVisible;
    
    // Liste des mots
    this.tabMots = [];
    var nbMots;
    
    // Liste des mots utilisés
    this.tabUtil = [];
    
    // Ensemble des mots utilisés dans la partie
    this.tabMotsUtilises = [];
    
    // Table des mots
    var tableMots;
    
    // Auto activé
    var activAuto;
    
    // Couleurs
    var color;
    
    // Liste des composants
    this.boxControls = [];
    
    // Joueurs courant et précédent
    var currentPlayer;
    var lastPlayer;
    
    // Handle pour next init
    var nextInitHnd;
    
    // Ligne sélectionnée par mouseOver
    var selecLigne;

    // Drag de la box
    var isDragging;
    
    // Tableau des accents
    this.diacriticsMap = {};


    ///////////////// INITIALISATION
    
    // Initialisation
    this.init = function()
    {
        console.log("Initialisation Post it");
        that = this;
        this.nbMots = 0;

        // Tableau des accents
        this.initDiacritics();

        this.visible = false;
        this.barreLateraleVisible = true;
        this.isDragging = false;
        this.color = { norm: "#323741", valid: "#437331", util: "#6B6B6B", selec: "#242457" };

        // Drag & drop
        document.body.addEventListener("dragover", this.dragOver, !1);
        document.body.addEventListener("drop", this.endDrag, !1);        

        // gmListen
        this.setGMListen();

        // Chargement des paramètres sauvegardés
        this.loadSavedParam();
        
        // setListeners quand BP est chargé
        this.nextInitHnd = setInterval(this.lookUp, 1000);
    };
        
    // Lookup pour la prochaine initialisation
    this.lookUp = function()
    {
        if (channel)
        {
            clearInterval(that.nextInitHnd);
            that.setListeners();
        }
    };

    // Interactions avec la partie
    this.setListeners = function()
    {
        this.ajoutPostBouton();

        channel.socket.on("setActivePlayerIndex", function(e)                                             
        {
            that.lastPlayer = that.currentPlayer;
            that.currentPlayer = channel.data.actors[channel.data.activePlayerIndex].authId;
            
            if (that.activAuto)
            {
                if (that.currentPlayer === app.user.authId)
                    that.validRacine(channel.data.wordRoot);
                else if (that.lastPlayer === app.user.authId)
                    that.devalidAll();
            }
        });
                          
        channel.socket.on("setState", function(a)
        { 
            if ((a === "playing") && (that.visible == true))
            {   
                that.devalidAll();
                
                that.tabUtil = [];
                for (var i = 0; i < that.nbMots; i++)
                    that.tabUtil.push(0);
                
                that.tabMotsUtilises = [];
                
                that.refreshTable();
            }
        });
        
        channel.socket.on("winWord", function(e)
        {
            var t = channel.data.actorsByAuthId[e.playerAuthId];            
            var mot = t.lastWord.trim().toLowerCase();
            var n = -1;
            
            if (that.tabMots)
                n = that.tabMots.indexOf(mot);
            
            if (n != -1)
            {
                that.tabUtil[n] = 1;
                var cell = that.tableMots.getElementsByTagName("td")[n * 2 + 1];
                cell.style.color = that.color.util;
            }
            
            that.addMotUtilise(mot);
        });
    };


    //////////////////////// GM LISTEN
    
    // Bouton invisible gmListen pour communiquer avec les fonctions GM
    this.setGMListen = function()
    {
        var gmListen = document.createElement("input");
        gmListen.id = "gmListen";
        gmListen.type = "button";
        gmListen.style.width = "0px";
        gmListen.style.height = "0px";
        gmListen.style.visibility = "hidden";
        this.boxControls.gmListen = gmListen;
        var l = document.getElementsByTagName("header")[0];
        var c = l.lastChild;
        l.insertBefore(gmListen, c);
    };

    // Sauvegarde de la liste des mots
    this.gmListenSaveTable = function()
    {
        var s = that.boxControls.gmListen;
        var str = "saveTable";
        var ln = that.tabMots.length;
        
        if (ln === 0)
            str += " ";
        else
           for (var j = 0; j < that.tabMots.length; j++)
               str += " " + that.tabMots[j];
        
        s.className = str;
        s.click();        
    };
    
    // Sauvegarde du bouton Auto
    this.gmListenSaveAuto = function()
    {
        var s = that.boxControls.gmListen;
        s.className = "saveAuto " + (that.activAuto ? "true" : "false");
        s.click();
    };
    
    // Chargement des paramètres sauvegardés
    this.loadSavedParam = function()
    {
        if (savedParam)
        {
            if (savedParam.listeMots)
            {
                var tab = savedParam.listeMots.split(" ");
                that.tabMots = tab;
                that.nbMots = tab.length;
            }
            if (savedParam.autoCheck)
                that.activAuto = (savedParam.autoCheck === "true");
        }
    };

    
    //////////////////////// GESTION DES ACCENTS

    // Tableau des caractères accentués et spéciaux
    this.defaultDiacriticsRemovalap = [
        {'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'},
        {'base':'AA','letters':'\uA732'},
        {'base':'AE','letters':'\u00C6\u01FC\u01E2'},
        {'base':'AO','letters':'\uA734'},
        {'base':'AU','letters':'\uA736'},
        {'base':'AV','letters':'\uA738\uA73A'},
        {'base':'AY','letters':'\uA73C'},
        {'base':'B', 'letters':'\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
        {'base':'C', 'letters':'\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
        {'base':'D', 'letters':'\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779'},
        {'base':'DZ','letters':'\u01F1\u01C4'},
        {'base':'Dz','letters':'\u01F2\u01C5'},
        {'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
        {'base':'F', 'letters':'\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
        {'base':'G', 'letters':'\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'},
        {'base':'H', 'letters':'\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'},
        {'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
        {'base':'J', 'letters':'\u004A\u24BF\uFF2A\u0134\u0248'},
        {'base':'K', 'letters':'\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'},
        {'base':'L', 'letters':'\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'},
        {'base':'LJ','letters':'\u01C7'},
        {'base':'Lj','letters':'\u01C8'},
        {'base':'M', 'letters':'\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
        {'base':'N', 'letters':'\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'},
        {'base':'NJ','letters':'\u01CA'},
        {'base':'Nj','letters':'\u01CB'},
        {'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'},
        {'base':'OI','letters':'\u01A2'},
        {'base':'OO','letters':'\uA74E'},
        {'base':'OU','letters':'\u0222'},
        {'base':'OE','letters':'\u008C\u0152'},
        {'base':'oe','letters':'\u009C\u0153'},
        {'base':'P', 'letters':'\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
        {'base':'Q', 'letters':'\u0051\u24C6\uFF31\uA756\uA758\u024A'},
        {'base':'R', 'letters':'\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'},
        {'base':'S', 'letters':'\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'},
        {'base':'T', 'letters':'\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'},
        {'base':'TZ','letters':'\uA728'},
        {'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'},
        {'base':'V', 'letters':'\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
        {'base':'VY','letters':'\uA760'},
        {'base':'W', 'letters':'\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
        {'base':'X', 'letters':'\u0058\u24CD\uFF38\u1E8A\u1E8C'},
        {'base':'Y', 'letters':'\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'},
        {'base':'Z', 'letters':'\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'},
        {'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'},
        {'base':'aa','letters':'\uA733'},
        {'base':'ae','letters':'\u00E6\u01FD\u01E3'},
        {'base':'ao','letters':'\uA735'},
        {'base':'au','letters':'\uA737'},
        {'base':'av','letters':'\uA739\uA73B'},
        {'base':'ay','letters':'\uA73D'},
        {'base':'b', 'letters':'\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
        {'base':'c', 'letters':'\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
        {'base':'d', 'letters':'\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'},
        {'base':'dz','letters':'\u01F3\u01C6'},
        {'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
        {'base':'f', 'letters':'\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
        {'base':'g', 'letters':'\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'},
        {'base':'h', 'letters':'\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'},
        {'base':'hv','letters':'\u0195'},
        {'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
        {'base':'j', 'letters':'\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
        {'base':'k', 'letters':'\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'},
        {'base':'l', 'letters':'\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'},
        {'base':'lj','letters':'\u01C9'},
        {'base':'m', 'letters':'\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
        {'base':'n', 'letters':'\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'},
        {'base':'nj','letters':'\u01CC'},
        {'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'},
        {'base':'oi','letters':'\u01A3'},
        {'base':'ou','letters':'\u0223'},
        {'base':'oo','letters':'\uA74F'},
        {'base':'p','letters':'\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
        {'base':'q','letters':'\u0071\u24E0\uFF51\u024B\uA757\uA759'},
        {'base':'r','letters':'\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'},
        {'base':'s','letters':'\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'},
        {'base':'t','letters':'\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'},
        {'base':'tz','letters':'\uA729'},
        {'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'},
        {'base':'v','letters':'\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
        {'base':'vy','letters':'\uA761'},
        {'base':'w','letters':'\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
        {'base':'x','letters':'\u0078\u24E7\uFF58\u1E8B\u1E8D'},
        {'base':'y','letters':'\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'},
        {'base':'z','letters':'\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
    ];

    // Initialisation du tableau des accents
    this.initDiacritics = function()
    {
        that.diacriticsMaps = {};
        
        for (var i = 0; i < that.defaultDiacriticsRemovalap.length; i++)
        {
            var letters = that.defaultDiacriticsRemovalap[i].letters;
            for (var j = 0; j < letters.length ; j++)
                that.diacriticsMap[letters[j]] = that.defaultDiacriticsRemovalap[i].base;
        }
    };

    // Renvoie str sans accent
    this.removeDiacritics = function(str)
    {
        return str.replace(/[^\u0000-\u007E]/g, function(a)
        {
            return that.diacriticsMap[a] || a; 
        });
    };

    
    ///////////////// FONCTIONS DRAG

    this.startDrag = function(e)
    {
        if (e.target.id === "postitBackground")
        {
            myPost.isDragging = true;
            var d = document.getElementById("postBox"), t = window.getComputedStyle(d, null);
            e.dataTransfer.setData("text/plain", parseInt(t.getPropertyValue("left"), 10) - e.clientX + "," + (parseInt(t.getPropertyValue("top"), 10) - e.clientY));
        }
    }

    this.endDrag = function(e)
    {
        if (myPost.isDragging)
        {
            var t = e.dataTransfer.getData("text/plain").split(","),
                a = document.getElementById("postBox"),
                n = e.clientX + parseInt(t[0], 10),
                o = e.clientY + parseInt(t[1], 10);

            a.style.left = n + "px";
            a.style.top = o + "px";
            e.preventDefault();
            myPost.isDragging = false;
        }
    }

    this.dragOver = function(e)
    {
        e.preventDefault();
    }
    
    
    ///////////////// MODIFICATION DE L'INTERFACE BP
    
    // Ajout du bouton Postit pour ouvrir la box
    this.ajoutPostBouton = function()
    {
        // paramètres
        var newBtn = document.createElement("input");
        newBtn.id = "btnPost";
        newBtn.type = "image"; 
        newBtn.src = postImg.btnPost;
        newBtn.style.outline = "none";
        newBtn.style.width = "30px";
        newBtn.style.height = "30px";

        // méthodes
        newBtn.addEventListener('click', this.clicPostBouton);
        
        var l = document.getElementsByTagName("header")[0];
        var c = l.lastChild;
        l.insertBefore(newBtn, c);
    };  
    
    // Clic sur le bouton Postit : la fenêtre s'ouvre
    this.clicPostBouton = function()
    {
        if (!that.visible)
        {
            // enlève la barre latérale
            that.switchBarreLaterale();
            
            // crée une nouvelle fenêtre
            that.popNewBox();        
            
            that.visible = true;
        }
        else
        {
            // supprime la box
            document.body.removeChild(document.getElementById("postBox"));
            
            that.lastPlayer = "";
            that.currentPlayer = "";
            that.visible = false;
        }
    };  
    
    // Désactive la barre à gauche
    this.switchBarreLaterale = function()
    {
        if (that.barreLateraleVisible)
        {
            var e = document.getElementById("ToggleMenuButton");
            e.click();
            that.barreLateraleVisible = false;
        }
    };

    
    ///////////////// COMPOSANTS DE L'INTERFACE
    
    // Crée un composant texte
    this.createNewText = function(id, text, left, top, width, height, size, color, parent, abs)
    {
        // Paramètres du texte
        var newText = document.createElement("DIV");
        newText.id = id;
        if (abs)
            newText.style.position = "absolute";
        newText.style.left = left + "px";
        newText.style.top = top + "px";
        newText.style.width = width + "px";
        newText.style.height = height + "px";
        newText.style.fontSize = size + "px";
        newText.style.color = "rgb(" + color + ")";
        newText.style.overflow = "hidden";
        newText.innerHTML = text;
        
        if (parent)
            parent.appendChild(newText);
        return newText;
    };    
    
    // Crée un composant image
    this.createNewImg = function(id, src, left, top, parent, abs)
    {
        // Paramètres de l'image
        var newImg = document.createElement("IMG");
        newImg.id = id;
        if (abs)
            newImg.style.position = "absolute";
        newImg.style.left = left + "px";
        newImg.style.top = top + "px";
        newImg.src = src;
        
        if (parent)
            parent.appendChild(newImg);
        return newImg;
    };    
    
    // Crée un composant bouton
    this.createNewButton = function(id, src, left, top, width, height, f, parent)
    {
        // Paramètres du bouton
        var newBtn = document.createElement("input");
        newBtn.id = id;
        newBtn.type = "image"; 
        newBtn.src = src;
        newBtn.style.outline = "none";
        newBtn.style.position = "absolute";
        newBtn.style.left = left + "px";
        newBtn.style.top = top + "px";
        newBtn.style.width = width + "px";
        newBtn.style.height = height + "px";
        
        // Méthodes
        newBtn.addEventListener('click', f);
        
        this.boxControls[id] = newBtn;
        parent.appendChild(newBtn);
        return newBtn;
    };

    
    ///////////////// CREATION DE L'INTERFACE
    
    // Crée une nouvelle fenêtre Post it
    this.popNewBox = function()
    {
        this.postBox = document.createElement("whatever");
        this.postBox.id = "postBox",
        this.postBox.draggable = "true",
        this.postBox.style.position = "absolute",
        this.postBox.style.left = "1px",
        this.postBox.style.top = "31px",
        this.postBox.style.width = "200px",
        this.postBox.style.height = "290px",
        this.postBox.style.overflow = "hidden",
        this.postBox.style.background = "rgb(20, 20, 20)";
        
        var back = this.createNewImg("postitBackground", postImg.postitBackground, 0, 0, this.postBox, true);
        back.draggable = "true";
        back.addEventListener("dragstart", that.startDrag);
                
        // Textbox transparente
        var textDiv = document.createElement("DIV");
        textDiv.id = "textDiv",
        textDiv.style.position = "absolute",
        textDiv.style.left = "24px",
        textDiv.style.top = "229px",
        textDiv.style.width = "152px",
        textDiv.style.height = "17px",
        textDiv.style.background = "transparent";
        
        var textBar = document.createElement("input");
        textBar.id = "textBar",
        textBar.type = "text",
        textBar.position = "absolute",
        textBar.style.left = "0px",
        textBar.style.top = "0px",
        textBar.style.width = "152px",
        textBar.style.height = "17px",
        textBar.style.fontSize = "13px",
        textBar.style.color = "rgb(200, 200, 200)",
        textBar.style.background = "transparent",
        textBar.style.border = "none",
        textBar.style.outline = "none",
        textBar.style.borderColor = "transparent",
        textBar.autocorrect = "off",
        textBar.spellcheck = false;

        textBar.addEventListener("keydown", this.textChange);
        
        this.boxControls['textBar'] = textBar;
        textDiv.appendChild(textBar);
        this.postBox.appendChild(textDiv);
        
        // Boutons
        
        this.createNewButton("boutCroix", postImg.boutCroix, 182, 0, 18, 20, this.boutCroixClic, this.postBox);
        
        this.createNewButton("btnAuto", (that.activAuto ? postImg.btnAutoSelec : postImg.btnAutoNorm), 0, 269, 66, 21, this.btnAutoClic, this.postBox);
        
        this.createNewButton("btnSort", postImg.btnSort, 66, 269, 67, 21, this.btnSortClic, this.postBox);

        this.createNewButton("btnClear", postImg.btnClear, 133, 269, 67, 21, this.btnClearClic, this.postBox);

        // Liste des mots
        
        var tableDiv = document.createElement("DIV");
        tableDiv.id = "tableDiv",
        tableDiv.className = "tableDiv",
        tableDiv.style.position = "absolute",
        tableDiv.style.left = "13px",
        tableDiv.style.top = "34px",
        tableDiv.style.width = "174px",
        tableDiv.style.height = "196px",
        tableDiv.style['overflow-y'] = "auto";
        tableDiv.style['overflow-x'] = "hidden";
        
        this.boxControls['tableDiv'] = tableDiv;
        this.postBox.appendChild(tableDiv);
        
        // Chargement de la liste sauvegardée si elle existe
        
        if (that.tabMots && (that.tabMots.length > 0))
            that.refreshTable();
        
        document.body.appendChild(this.postBox);
    };

    // Crée la nouvelle table à partir de tabMots
    this.createTable = function()
    {
        that.tableMots = document.createElement("TABLE");
        that.tableMots.id = "tableMots";        
        that.tableMots.style.tableLayout = "fixed";
        that.tableMots.style.width = "100%";
        that.tableMots.style.border = "none";
        that.tableMots.style.borderSpacing = "0";
        that.tableMots.style.borderCollapse = "collapse";
        that.tableMots.style.overflow = "hidden";      
        
        var n = that.tabMots.length;
        
        for(var i = 0; i < n; i++)
        {
            var ligne = this.tableMots.insertRow(i);
            ligne.style.height = "17px";
            
            // Première colonne
            var colonne1 = ligne.insertCell(0);
            colonne1.style.width = "5px";
            
            // Deuxième colonne
            var colonne2 = ligne.insertCell(1);
            colonne2.style.width = "169px";
            colonne2.style.fontSize = "13px";
            colonne2.style.color = "rgb(200, 200, 200)";
            colonne2.innerHTML = this.tabMots[i];
            
            colonne1.addEventListener("mouseover", this.listMouseOver);
            colonne2.addEventListener("mouseover", this.listMouseOver);
            colonne1.addEventListener("mouseout", this.listMouseOut);
            colonne2.addEventListener("mouseout", this.listMouseOut);
            colonne1.addEventListener("mouseup", this.listMouseUp);
            colonne2.addEventListener("mouseup", this.listMouseUp);            
        }        
    };

    // Supprime la table courante
    this.emptyTable = function()
    {
        var emt = that.tableMots;
        
        while (emt.lastChild)
            emt.removeChild(emt.lastChild);
    };
    
    // Rafraichit la table
    this.refreshTable = function()
    {
        // Envoi de la liste des mots à gmListen
        that.gmListenSaveTable();
        
        if (that.tableMots)
            that.emptyTable();
        
        that.createTable();
        
        that.appUtil();
        
        that.boxControls['tableDiv'].appendChild(that.tableMots);
        that.boxControls['tableMots'] = that.tableMots;
    };
    
    
    ///////////////// METHODES ET EVENEMENTS DE L'INTERFACE

    // Bouton Auto
    this.btnAutoClic = function()
    {
        if (that.activAuto)
        {
            that.boxControls['btnAuto'].src = postImg.btnAutoNorm;
            that.activAuto = false;
        }
        else
        {
            that.boxControls['btnAuto'].src = postImg.btnAutoSelec;
            that.activAuto = true;
        }
        
        that.gmListenSaveAuto();
    };
    
    // Bouton Sort
    this.btnSortClic = function()
    {
        // Sauvegarde des mots utilisés
        var tabTemp = [], n = that.nbMots;
        for (var i = 0; i < n; i++)
            if (that.tabUtil[i])
                tabTemp.push(that.tabMots[i]);
        
        that.tabMots.sort();
        
        // Réorganisation des mots utilisés
        that.tabUtil = [];
        for (var i = 0; i < n; i++)
        {
            if (tabTemp.indexOf(that.tabMots[i]) != -1)
                that.tabUtil[i] = 1;
            else
                that.tabUtil[i] = 0;
        }
        
        that.refreshTable();
    };
    
    // Bouton Clear
    this.btnClearClic = function()
    {
        that.tabMots = [];
        that.nbMots = 0;
        that.tabUtil = [];
        
        that.refreshTable();
    };    
    
    // Validation de textBar
    this.textChange = function(e)
    {
        if(e.keyCode == 13)
        {
            var val = that.boxControls.textBar.value;
            that.boxControls.textBar.value = "";
            
            that.addMots(val);
        }        
    };
    
    // Clic sur le bouton croix
    this.boutCroixClic = function()
    {
        that.clicPostBouton();
    };
    
    // La souris arrive sur une ligne de la table : elle est sélectionnée
    this.listMouseOver = function()
    {
        var n = this.parentNode.rowIndex;
        that.selecLigne = n;
        
        this.parentNode.style.backgroundColor = that.color.selec;
    };

    // La souris quitte une ligne de la table : elle est déselectionnée
    this.listMouseOut = function()
    {
        var n = this.parentNode.rowIndex;
        if ((that.currentPlayer === app.user.authId) && (that.tabMots[n].indexOf(channel.data.wordRoot.trim().toLowerCase()) != -1) && (that.tabUtil[n] != 1))
            this.parentNode.style.backgroundColor = that.color.valid;
        else
            this.parentNode.style.backgroundColor = that.color.norm;
    };

    // La souris clique sur une ligne de la table : le mot est supprimé
    this.listMouseUp = function(e)
    {
        e.preventDefault();
        
        var n = that.selecLigne;
        
        that.tabMots.splice(n, 1);
        that.tabUtil.splice(n, 1);
        that.nbMots--;
        
        that.refreshTable();
    };

    
    ///////////////// METHODES
    
    // Mode auto : valide les mots contenant la racine courante
    this.validRacine = function(str)
    {
        if (!that.tableMots)
            return;

        var n = that.nbMots;
        str = that.removeDiacritics(str.trim().toLowerCase());
        for (var i = 0; i < n; i++)
        {
            if ((that.tabMots[i].indexOf(str) != -1) && (that.tabUtil[i] != 1))
            {
                var elem = that.tableMots.getElementsByTagName("td")[i * 2];
                
                elem.parentNode.style.backgroundColor = that.color.valid;
            }
        }
    };
    
    // Mode auto : dévalide tous les mots
    this.devalidAll = function()
    {
        if (!that.tableMots)
            return;
        
        var n = that.nbMots;
        var elemTab = that.tableMots.getElementsByTagName("td");
        
        for (var i = 0; i < n; i++)
        {
            var elem = elemTab[i * 2];
            
            elem.parentNode.style.backgroundColor = that.color.norm;
        }
        
        that.appUtil();
    };
    
    // Ajout de mots dans tabMots
    this.addMots = function(str)
    {
        var tab = str.split(' '), ln = tab.length;
        
        for (var i = 0; i < ln; i++)
            if (that.tabMots.length < 10)
            {
                var mot = tab[i];
                if (mot)
                {
                    var mot = that.removeDiacritics(mot.trim().toLowerCase());
                    if ((/^[a-z]+$/.test(mot)) && (that.tabMots.indexOf(mot) === -1))
                    {
                        that.tabMots.push(mot);
                        that.nbMots++;
                        if (that.dansMotsUtilises(mot))
                            that.tabUtil.push(1);
                        else
                            that.tabUtil.push(0);
                    }
                }
            }
            else
                break;
        
        that.refreshTable();
    };
    
    // Applique tabUtil à la table des mots
    this.appUtil = function()
    {
        if ((that.tabUtil) && (that.tabUtil.length > 0))
        {
            var n = that.nbMots;
            
            for (var i = 0; i < n; i++)
                if (that.tabUtil[i])
                {
                    var cell = that.tableMots.getElementsByTagName("td")[i * 2 + 1];
                    cell.style.color = that.color.util;
                }
        }
    };
    
    
    ///////////////// RECHERCHE DICHOTOMIQUE
    
    // fonction de comparaison de 2 chaînes
    this.compareStr = function(str1, str2)
    {
        return (str1 < str2) ? -1 : (str1 > str2 ? 1 : 0);    
    };

    // recherche dichotomique de val dans le tableau sortedArr
    // renvoie un booléen et un entier pour la place
    this.rechercheDicho = function(val, sortedArr)
    {   
        var low = 0, high = sortedArr.length;
        if (high == 0)
            return { trouv: false, place: 0 };
        var mid = -1, c = 0;
        while(low < high)
        {
            mid = parseInt((low + high)/2);
            c = that.compareStr(sortedArr[mid], val);
            if(c < 0) { low = mid + 1; }
            else if (c > 0) { high = mid; }
            else { return { trouv: (c == 0), place: mid }; }
        }
        return { trouv: (c == 0), place: low };
    };

    // utilise la recherche dichotomique pour savoir si un mot a été utilisé
    this.dansMotsUtilises = function(mot)
    {
        var res = that.rechercheDicho(mot, that.tabMotsUtilises).trouv;
        if (that.tabMotsUtilises.length == 0) return false;
        else return (res);
    };    
    
    // Ajoute un mot dans tabMotsUtilises de manière triée
    this.addMotUtilise = function(mot)
    {
        if (that.tabMotsUtilises.length == 0)
            that.tabMotsUtilises = [mot];
        else
        {
            var s = that.rechercheDicho(mot, that.tabMotsUtilises);
            if (s.trouv === false) that.tabMotsUtilises.splice(s.place, 0, mot);
        }
    };   
};


///////////////// CREATION DU SCRIPT

// Chargement de la liste en mémoire
var listValues = GM_listValues();
var sParam = 'var savedParam = { autoCheck: ' + (listValues.indexOf("autoCheck") != -1 ? '"' + GM_getValue("autoCheck") + '"' : 'null')
                            + ', listeMots: ' + (listValues.indexOf("listeMots") != -1 ? '"' + GM_getValue("listeMots") + '"' : 'null') + '};';

// Déclaration des images
var sImg = 'var postImg = { btnPost : "' + GM_getResourceURL("btnPost") + '",' + 'boutCroix : "' + GM_getResourceURL("boutCroix") + '",' + 'btnAutoNorm : "' + GM_getResourceURL("btnAutoNorm") + '",' + 'btnAutoSelec : "' + GM_getResourceURL("btnAutoSelec") + '",' + 'btnSort : "' + GM_getResourceURL("btnSort") + '",' + 'btnClear : "' + GM_getResourceURL("btnClear") + '",' + 'postitBackground : "' + GM_getResourceURL("postitBackground") + '"}; ';

// Déclaration du script
var sPostit = 'var postIt = ' + postIt + '; var myPost = new postIt(); myPost.init();';

// Ajout du script au document
var te = document.createElement("script");
te.setAttribute("type", "application/javascript");
te.textContent = sParam + sImg + sPostit;
document.body.appendChild(te);

// Communication avec le script sur la page
document.getElementById("gmListen").addEventListener("click", gmListenClick);
function gmListenClick()
{
    var s = this.className;
    var pos = s.indexOf(" ");
    var cmd = s.substring(0, pos);
    var param = s.substring(pos + 1, s.length);
    
    switch (cmd)
    {
        case "saveTable":
        {
            GM_setValue("listeMots", param);
            break;
        }
        case "saveAuto":
        {
            GM_setValue("autoCheck", param);
            break;
        }
    }
    
    this.className = "";
}
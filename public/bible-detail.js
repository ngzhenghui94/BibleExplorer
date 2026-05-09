// Per-book metadata and per-chapter detail.
// Authorship and dates follow traditional/scholarly consensus where there's
// broad agreement; otherwise marked as such. Summaries aim for one or two
// honest sentences without picking sides on contested interpretations.

const BOOK_INFO = {
  // ---- Old Testament ----
  "Genesis":         { author: "Traditionally Moses", era: "c. 1400 BC", theme: "Beginnings — creation, the fall, the patriarchs.", overview: "How everything began, how it broke, and how God began to put it back together through one family." },
  "Exodus":          { author: "Traditionally Moses", era: "c. 1400 BC", theme: "Rescue and covenant.", overview: "God hears his enslaved people, brings them out by a mighty hand, and binds himself to them in covenant at Sinai." },
  "Leviticus":       { author: "Traditionally Moses", era: "c. 1400 BC", theme: "How a holy God dwells with his people.", overview: "Sacrifices, feasts, and laws that teach Israel what holiness looks like in everyday life." },
  "Numbers":         { author: "Traditionally Moses", era: "c. 1400 BC", theme: "Forty years in the wilderness.", overview: "The generation that left Egypt grumbles and dies in the desert; their children inherit the promise." },
  "Deuteronomy":     { author: "Traditionally Moses", era: "c. 1400 BC", theme: "Moses' final sermons.", overview: "On the edge of the promised land, Moses retells the story and calls Israel to choose life by loving the Lord." },
  "Joshua":          { author: "Traditionally Joshua", era: "c. 1370 BC", theme: "Conquest and inheritance.", overview: "The promised land becomes home as Israel takes possession, tribe by tribe." },
  "Judges":          { author: "Anonymous (perhaps Samuel)", era: "c. 1050 BC", theme: "Spiral of sin and rescue.", overview: "Israel forgets God, suffers, cries out, gets rescued, and forgets again. Everyone does what is right in their own eyes." },
  "Ruth":            { author: "Anonymous", era: "c. 1000 BC", theme: "Loyal love, kinsman-redeemer.", overview: "A Moabite widow's faithfulness places her in the line of David — and of Jesus." },
  "1 Samuel":        { author: "Anonymous", era: "c. 930 BC", theme: "From the last judge to the first king.", overview: "Samuel anoints Saul, Saul falters, and David — a shepherd boy — is anointed in his place." },
  "2 Samuel":        { author: "Anonymous", era: "c. 930 BC", theme: "The reign — and the failures — of David.", overview: "David unifies the kingdom, receives an everlasting covenant, and learns the cost of his own sin." },
  "1 Kings":         { author: "Anonymous", era: "c. 560 BC", theme: "Glory and division.", overview: "Solomon builds the temple in glory; after him the kingdom splits, and prophets like Elijah confront wicked kings." },
  "2 Kings":         { author: "Anonymous", era: "c. 560 BC", theme: "Decline and exile.", overview: "Both kingdoms slide toward judgment. Israel falls to Assyria, then Judah to Babylon." },
  "1 Chronicles":    { author: "Traditionally Ezra", era: "c. 430 BC", theme: "David retold for the returnees.", overview: "Israel's story re-presented to a people back from exile, focused on temple and David's line." },
  "2 Chronicles":    { author: "Traditionally Ezra", era: "c. 430 BC", theme: "The kings of Judah and the temple.", overview: "From Solomon's temple to the exile, with an eye to worship and faithfulness." },
  "Ezra":            { author: "Ezra", era: "c. 440 BC", theme: "Return and rebuild.", overview: "Exiles return to Jerusalem, rebuild the temple, and recommit to the law of God." },
  "Nehemiah":        { author: "Nehemiah", era: "c. 430 BC", theme: "Rebuilding the walls.", overview: "A Persian cupbearer leads Jerusalem in a 52-day rebuild — and a deeper renewal of covenant." },
  "Esther":          { author: "Anonymous", era: "c. 460 BC", theme: "God's hidden hand.", overview: "In a Persian court where God is never named, his providence saves his people from genocide." },
  "Job":             { author: "Anonymous", era: "Ancient (uncertain)", theme: "Why do the righteous suffer?", overview: "A blameless man loses everything and wrestles with God; in the end, God answers — not with reasons, but with himself." },
  "Psalms":          { author: "David and others", era: "c. 1000–450 BC", theme: "The prayerbook of God's people.", overview: "150 songs covering every human emotion — praise, lament, trust, anger, hope — addressed to God." },
  "Proverbs":        { author: "Solomon and others", era: "c. 950–700 BC", theme: "Wisdom for daily life.", overview: "Short, vivid sayings that train the heart to live skillfully under God." },
  "Ecclesiastes":    { author: "Traditionally Solomon ('the Preacher')", era: "c. 940 BC", theme: "The search for meaning.", overview: "An honest reckoning with life under the sun: vanity, beauty, work, death — and the fear of God." },
  "Song of Solomon": { author: "Traditionally Solomon", era: "c. 950 BC", theme: "A song of love.", overview: "Poetry of human love and longing — read by many as a window onto God's love for his people." },
  "Isaiah":          { author: "Isaiah", era: "c. 700 BC", theme: "Judgment and consolation.", overview: "The grandest of the prophets: judgment on the proud, comfort for exiles, and a suffering servant who saves." },
  "Jeremiah":        { author: "Jeremiah", era: "c. 600 BC", theme: "The weeping prophet.", overview: "Forty years of warning a stubborn nation, ending in the fall of Jerusalem and the promise of a new covenant." },
  "Lamentations":    { author: "Traditionally Jeremiah", era: "c. 586 BC", theme: "Grief over a fallen city.", overview: "Five poems of mourning for Jerusalem's destruction — and a stubborn line about mercies that are new every morning." },
  "Ezekiel":         { author: "Ezekiel", era: "c. 585 BC", theme: "Visions in exile.", overview: "Wild signs and visions for a people far from home — including dry bones rising and a temple yet to come." },
  "Daniel":          { author: "Daniel", era: "c. 530 BC", theme: "Faith in a foreign empire.", overview: "Stories of courage in Babylon, and visions of kingdoms that rise and fall before the kingdom that does not end." },
  "Hosea":           { author: "Hosea", era: "c. 750 BC", theme: "God's love for an unfaithful people.", overview: "The prophet's marriage becomes a parable of God's covenant love for wandering Israel." },
  "Joel":            { author: "Joel", era: "c. 800–500 BC", theme: "The day of the Lord.", overview: "A locust plague becomes a window onto judgment — and the promise of the Spirit poured out on all flesh." },
  "Amos":            { author: "Amos", era: "c. 760 BC", theme: "Let justice roll down.", overview: "A shepherd from Tekoa thunders against complacent worship and oppression of the poor." },
  "Obadiah":         { author: "Obadiah", era: "c. 586 BC", theme: "Judgment on Edom.", overview: "The shortest book in the Old Testament: a warning to the nation that gloated when Jerusalem fell." },
  "Jonah":           { author: "Anonymous", era: "c. 760 BC", theme: "The reluctant prophet.", overview: "A prophet runs from God, gets swallowed by a fish, and watches a city he hates repent." },
  "Micah":           { author: "Micah", era: "c. 730 BC", theme: "What the Lord requires.", overview: "Judgment and hope — including the ruler from Bethlehem and the famous call to do justice, love mercy, walk humbly." },
  "Nahum":           { author: "Nahum", era: "c. 660 BC", theme: "The fall of Nineveh.", overview: "A century after Jonah, the prophet announces that the empire's brutality will be brought down." },
  "Habakkuk":        { author: "Habakkuk", era: "c. 605 BC", theme: "Wrestling with God's silence.", overview: "Why does evil go unanswered? The prophet's questions become a song of trust — the righteous will live by faith." },
  "Zephaniah":       { author: "Zephaniah", era: "c. 630 BC", theme: "The day of the Lord — fire and singing.", overview: "Judgment that ends in a startling picture of God rejoicing over his people with singing." },
  "Haggai":          { author: "Haggai", era: "c. 520 BC", theme: "Rebuild the temple.", overview: "Four short messages to returnees who got busy with their own houses while God's house lay in ruins." },
  "Zechariah":       { author: "Zechariah", era: "c. 520 BC", theme: "Visions of restoration.", overview: "Eight night visions and oracles pointing to a coming king who is humble and rides a donkey." },
  "Malachi":         { author: "Malachi", era: "c. 430 BC", theme: "The last word.", overview: "A final call to faithfulness before four hundred years of silence — and a promise that Elijah will come first." },
  // ---- New Testament ----
  "Matthew":         { author: "Matthew the apostle (traditionally)", era: "c. 60–70 AD", theme: "Jesus the promised King.", overview: "The first gospel, weaving Old Testament fulfillment around five great teaching blocks — including the Sermon on the Mount." },
  "Mark":            { author: "Mark (Peter's interpreter)", era: "c. 55–65 AD", theme: "Jesus the suffering Son of Man.", overview: "The shortest gospel: fast-moving, urgent, and unafraid of the cross." },
  "Luke":            { author: "Luke the physician", era: "c. 60–65 AD", theme: "An orderly account for everyone.", overview: "A careful, compassionate gospel — full of outsiders, women, and the poor finding good news." },
  "John":            { author: "John the apostle", era: "c. 85–95 AD", theme: "Believe and have life.", overview: "Seven signs and seven 'I am' sayings, written so that you may believe Jesus is the Christ." },
  "Acts":            { author: "Luke", era: "c. 62–65 AD", theme: "From Jerusalem to Rome.", overview: "The Spirit is poured out, the church is born, and the gospel travels from a Jewish movement to a movement for the world." },
  "Romans":          { author: "Paul", era: "c. 57 AD", theme: "The gospel for everyone.", overview: "Paul's masterwork: no one is righteous, all may be justified by faith, and nothing can separate us from the love of God." },
  "1 Corinthians":   { author: "Paul", era: "c. 55 AD", theme: "Wisdom and order in a messy church.", overview: "Letters to a divided, gifted, struggling church — answering questions about sex, lawsuits, communion, gifts, and resurrection." },
  "2 Corinthians":   { author: "Paul", era: "c. 56 AD", theme: "Strength in weakness.", overview: "Paul defends his ministry and unfolds the paradox: God's power shines through cracked clay jars." },
  "Galatians":       { author: "Paul", era: "c. 49 AD", theme: "Saved by faith, not law.", overview: "A fierce defense of the gospel against the demand to add anything to the finished work of Christ." },
  "Ephesians":       { author: "Paul", era: "c. 60 AD", theme: "One new humanity.", overview: "The cosmic shape of salvation — Jew and Gentile reconciled in Christ, called to walk worthy of that calling." },
  "Philippians":     { author: "Paul", era: "c. 61 AD", theme: "Joy from a Roman prison.", overview: "Paul writes to friends from chains, modeling joy, partnership, and the mind of Christ." },
  "Colossians":      { author: "Paul", era: "c. 60 AD", theme: "The supremacy of Christ.", overview: "A short letter against hollow philosophies: in Christ all things hold together, and in him you are complete." },
  "1 Thessalonians": { author: "Paul", era: "c. 50 AD", theme: "Holding fast as we wait.", overview: "Encouragement for a young church under pressure, with a clear hope that Jesus is coming back." },
  "2 Thessalonians": { author: "Paul", era: "c. 51 AD", theme: "Don't be deceived.", overview: "A follow-up: keep working, watch for deception, and stand firm until the day arrives." },
  "1 Timothy":       { author: "Paul", era: "c. 62 AD", theme: "How to lead the church.", overview: "Pastoral instructions to a young leader — sound doctrine, qualified elders, godliness with contentment." },
  "2 Timothy":       { author: "Paul", era: "c. 66 AD", theme: "Pass on the faith.", overview: "Paul's last letter, written from prison near the end of his life: guard the deposit and run the race." },
  "Titus":           { author: "Paul", era: "c. 62 AD", theme: "Doctrine that produces good works.", overview: "A short pastoral letter for the church on Crete — what to teach, how to live, how grace re-shapes a life." },
  "Philemon":        { author: "Paul", era: "c. 60 AD", theme: "A runaway returned as a brother.", overview: "Paul asks a friend to receive his runaway slave Onesimus not as property, but as a beloved brother." },
  "Hebrews":         { author: "Anonymous", era: "c. 60–70 AD", theme: "Jesus better than every shadow.", overview: "Christ is the better priest, better sacrifice, better covenant — so don't drift; hold fast." },
  "James":           { author: "James, brother of Jesus (traditionally)", era: "c. 45–60 AD", theme: "Faith that works.", overview: "Plain, practical wisdom: tame the tongue, care for the poor, and let your faith show up in your life." },
  "1 Peter":         { author: "Peter", era: "c. 62 AD", theme: "Hope for exiles.", overview: "Suffering Christians in Asia Minor are reminded who they are: a chosen people, born again to a living hope." },
  "2 Peter":         { author: "Peter", era: "c. 65 AD", theme: "The Lord is coming.", overview: "Watch out for false teachers, grow in grace, and don't mistake delay for absence." },
  "1 John":          { author: "John", era: "c. 90 AD", theme: "God is light. God is love.", overview: "Tests of true faith — walking in light, loving the brethren, and trusting Jesus come in the flesh." },
  "2 John":          { author: "John", era: "c. 90 AD", theme: "Walk in truth and love.", overview: "A postcard-sized letter: hold to the apostolic teaching, and don't welcome those who deny Christ." },
  "3 John":          { author: "John", era: "c. 90 AD", theme: "Hospitality and humility.", overview: "A note about welcoming travelling teachers — and a warning about a leader who loved being first." },
  "Jude":            { author: "Jude, brother of James", era: "c. 65 AD", theme: "Contend for the faith.", overview: "A fiery one-chapter letter against false teachers, ending in one of the great doxologies of the New Testament." },
  "Revelation":      { author: "John", era: "c. 95 AD", theme: "A vision of the end.", overview: "Letters to seven churches, then visions of judgment and consummation — ending with a new heaven and a new earth." },
};

// Detail for landmark chapters: a short summary, optional key verses, optional
// cross-references (chapter ids that exist in CHAPTER_BY_ID).
const CHAPTER_DETAIL = {
  "Gen 1": {
    summary: "God speaks the universe into being in six days — light, sky, sea, land, plants, sun and moon, animals — and on the sixth day creates humanity, male and female, in his own image.",
    verses: [{ ref: "1:1", text: "In the beginning, God created the heavens and the earth." }, { ref: "1:27", text: "So God created man in his own image…" }],
    crossRefs: ["John 1", "Heb 11", "Rev 21"],
  },
  "Gen 3": {
    summary: "The serpent tempts the woman; she and the man eat the forbidden fruit. Shame, blame, and exile follow — but already a promise: the offspring of the woman will crush the serpent's head.",
    verses: [{ ref: "3:15", text: "He shall bruise your head, and you shall bruise his heel." }],
    crossRefs: ["Rom 5", "Rev 12"],
  },
  "Gen 22": {
    summary: "God tests Abraham, asking him to offer his son Isaac. At the last moment a ram is provided in Isaac's place — on the mountain of the Lord it shall be provided.",
    verses: [{ ref: "22:14", text: "The Lord will provide." }],
    crossRefs: ["John 3", "Heb 11"],
  },
  "Exod 14": {
    summary: "Pharaoh's army closes in. Moses lifts his staff, the sea splits, and Israel walks through on dry ground. The waters return on Egypt.",
    verses: [{ ref: "14:14", text: "The Lord will fight for you, and you have only to be silent." }],
    crossRefs: ["Ps 77", "1 Cor 10"],
  },
  "Exod 20": {
    summary: "From Sinai, in fire and smoke, God speaks ten words to his redeemed people — the shape of a life that loves God and loves neighbor.",
    crossRefs: ["Deut 5", "Matt 5", "Rom 13"],
  },
  "Deut 6": {
    summary: "The Shema — hear, O Israel — and the command to love the Lord with all your heart, soul, and might. Teach these words to your children.",
    verses: [{ ref: "6:4–5", text: "Hear, O Israel: the Lord our God, the Lord is one. You shall love the Lord your God with all your heart…" }],
    crossRefs: ["Mark 12", "Matt 22"],
  },
  "Josh 1": {
    summary: "Moses is dead; Joshua leads. Three times God says, 'Be strong and courageous' — for the Lord your God is with you wherever you go.",
    verses: [{ ref: "1:9", text: "Be strong and courageous… for the Lord your God is with you wherever you go." }],
    crossRefs: ["Deut 31", "Heb 13"],
  },
  "Ruth 1": {
    summary: "After famine and bereavement, Naomi tries to send her widowed daughters-in-law home. Ruth refuses to leave: where you go, I will go.",
    verses: [{ ref: "1:16", text: "Where you go I will go… your people shall be my people, and your God my God." }],
    crossRefs: ["Matt 1"],
  },
  "1 Sam 17": {
    summary: "A teenage shepherd faces a giant with five smooth stones and the name of the Lord of hosts. Goliath falls.",
    verses: [{ ref: "17:45", text: "You come to me with a sword… but I come to you in the name of the Lord of hosts." }],
    crossRefs: ["Heb 11"],
  },
  "1 Kgs 19": {
    summary: "Elijah collapses in despair, asks to die, and is fed by an angel. At Horeb, God passes by — not in wind, earthquake, or fire, but in a low whisper.",
    verses: [{ ref: "19:12", text: "And after the fire the sound of a low whisper." }],
    crossRefs: ["Matt 17"],
  },
  "Job 38": {
    summary: "After thirty-five chapters of speeches, God answers Job out of the whirlwind — not with reasons but with questions: where were you when I laid the foundations of the earth?",
    crossRefs: ["Ps 19", "Rom 11"],
  },
  "Ps 1": {
    summary: "Two ways: blessed is the one who delights in the law of the Lord; the wicked are like chaff the wind drives away.",
    verses: [{ ref: "1:1–2", text: "Blessed is the man… whose delight is in the law of the Lord." }],
    crossRefs: ["Jer 17", "Matt 7"],
  },
  "Ps 22": {
    summary: "A psalm of agony that Jesus quotes from the cross — yet ends in worldwide praise. They have pierced my hands and feet… he has done it.",
    verses: [{ ref: "22:1", text: "My God, my God, why have you forsaken me?" }],
    crossRefs: ["Matt 27", "Mark 15"],
  },
  "Ps 23": {
    summary: "The most loved song in the world: the Lord is my shepherd; I shall not want. Through the darkest valley, he is with me.",
    verses: [{ ref: "23:1", text: "The Lord is my shepherd; I shall not want." }, { ref: "23:4", text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me." }],
    crossRefs: ["John 10", "Rev 7"],
  },
  "Ps 51": {
    summary: "David's prayer of repentance after his sin with Bathsheba. Wash me, create in me a clean heart, restore the joy of your salvation.",
    verses: [{ ref: "51:10", text: "Create in me a clean heart, O God, and renew a right spirit within me." }],
    crossRefs: ["2 Sam 12", "1 Jn 1"],
  },
  "Ps 91": {
    summary: "He who dwells in the shelter of the Most High will abide in the shadow of the Almighty. A psalm of fearless trust.",
    verses: [{ ref: "91:1", text: "He who dwells in the shelter of the Most High…" }],
    crossRefs: ["Matt 4"],
  },
  "Ps 119": {
    summary: "The longest chapter in the Bible — an acrostic poem in 22 stanzas, each a love letter to God's word.",
    verses: [{ ref: "119:105", text: "Your word is a lamp to my feet and a light to my path." }],
  },
  "Prov 3": {
    summary: "Trust in the Lord with all your heart and lean not on your own understanding. Practical wisdom about trust, generosity, and the fear of the Lord.",
    verses: [{ ref: "3:5–6", text: "Trust in the Lord with all your heart, and do not lean on your own understanding." }],
  },
  "Eccl 3": {
    summary: "For everything there is a season — a time to be born and a time to die. God has put eternity in our hearts.",
    verses: [{ ref: "3:1", text: "For everything there is a season, and a time for every matter under heaven." }, { ref: "3:11", text: "He has put eternity into man's heart." }],
  },
  "Song 2": {
    summary: "My beloved is mine, and I am his. Spring has come; the voice of the turtledove is heard in our land.",
    verses: [{ ref: "2:16", text: "My beloved is mine, and I am his." }],
  },
  "Isa 6": {
    summary: "In the year King Uzziah died, Isaiah sees the Lord high and lifted up. Seraphim cry holy, holy, holy. Isaiah cries woe is me — and is sent.",
    verses: [{ ref: "6:3", text: "Holy, holy, holy is the Lord of hosts." }, { ref: "6:8", text: "Here I am! Send me." }],
    crossRefs: ["John 12", "Rev 4"],
  },
  "Isa 40": {
    summary: "Comfort, comfort my people. A voice cries in the wilderness; the grass withers but the word of God stands forever; those who wait on the Lord renew their strength.",
    verses: [{ ref: "40:31", text: "They who wait for the Lord shall renew their strength; they shall mount up with wings like eagles." }],
    crossRefs: ["Mark 1"],
  },
  "Isa 53": {
    summary: "The suffering servant — despised and rejected, pierced for our transgressions, crushed for our iniquities. By his wounds we are healed.",
    verses: [{ ref: "53:5", text: "He was pierced for our transgressions; he was crushed for our iniquities." }],
    crossRefs: ["Acts 8", "1 Pet 2"],
  },
  "Isa 55": {
    summary: "Come, all you who thirst — come to the waters. Seek the Lord while he may be found. My word will not return empty.",
    verses: [{ ref: "55:1", text: "Come, everyone who thirsts, come to the waters." }],
  },
  "Jer 29": {
    summary: "A letter to exiles in Babylon: build houses, plant gardens, seek the welfare of the city. I know the plans I have for you — plans for welfare and not for evil.",
    verses: [{ ref: "29:11", text: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil…" }],
  },
  "Lam 3": {
    summary: "From the depths of grief, a stubborn turn upward: the steadfast love of the Lord never ceases; his mercies are new every morning.",
    verses: [{ ref: "3:22–23", text: "His mercies never come to an end; they are new every morning; great is your faithfulness." }],
  },
  "Ezek 37": {
    summary: "Ezekiel sees a valley of dry bones. He prophesies; sinews and flesh come together; the Spirit breathes; a vast army stands. So God will raise his people.",
    verses: [{ ref: "37:5", text: "Behold, I will cause breath to enter you, and you shall live." }],
    crossRefs: ["John 11", "Rom 8"],
  },
  "Dan 3": {
    summary: "Three young men refuse to bow to a golden image. Thrown into a furnace seven times hotter than usual, they walk unharmed — with a fourth figure beside them.",
    verses: [{ ref: "3:17–18", text: "Our God whom we serve is able to deliver us… but if not, we still will not serve your gods." }],
  },
  "Dan 7": {
    summary: "A night vision of four beasts — and one like a son of man coming with the clouds, given dominion that will never pass away.",
    verses: [{ ref: "7:13–14", text: "Behold, with the clouds of heaven there came one like a son of man…" }],
    crossRefs: ["Mark 14", "Rev 1"],
  },
  "Hos 11": {
    summary: "When Israel was a child, I loved him. How can I give you up? God's heart breaks open over a people who keep wandering.",
    verses: [{ ref: "11:1", text: "When Israel was a child, I loved him, and out of Egypt I called my son." }],
  },
  "Jonah 2": {
    summary: "From inside the fish, Jonah prays. Salvation belongs to the Lord — and the fish vomits him out onto dry land.",
    verses: [{ ref: "2:9", text: "Salvation belongs to the Lord!" }],
  },
  "Mic 6": {
    summary: "What does the Lord require of you? To do justice, to love kindness, and to walk humbly with your God.",
    verses: [{ ref: "6:8", text: "He has told you, O man, what is good… to do justice, and to love kindness, and to walk humbly with your God." }],
  },
  "Hab 3": {
    summary: "A prayer-song. Though the fig tree should not blossom and there be no fruit on the vines — yet I will rejoice in the Lord.",
    verses: [{ ref: "3:17–18", text: "Though the fig tree should not blossom… yet I will rejoice in the Lord." }],
  },
  "Mal 4": {
    summary: "The day is coming, burning like an oven. But for those who fear my name, the sun of righteousness shall rise with healing in its wings.",
    verses: [{ ref: "4:2", text: "The sun of righteousness shall rise with healing in its wings." }],
    crossRefs: ["Matt 17", "Luke 1"],
  },
  "Matt 5": {
    summary: "Jesus goes up the mountain and begins the Sermon on the Mount with the Beatitudes — blessing the poor, the mourning, the meek, the merciful, the pure in heart.",
    verses: [{ ref: "5:3", text: "Blessed are the poor in spirit, for theirs is the kingdom of heaven." }],
    crossRefs: ["Luke 6"],
  },
  "Matt 6": {
    summary: "The Sermon continues — generosity, prayer, and trust. Jesus teaches the Lord's Prayer and tells us not to be anxious; seek first the kingdom.",
    verses: [{ ref: "6:33", text: "Seek first the kingdom of God and his righteousness, and all these things will be added to you." }],
  },
  "Matt 28": {
    summary: "An empty tomb. An angel says he has risen. Jesus meets the disciples and gives the Great Commission — go and make disciples of all nations.",
    verses: [{ ref: "28:19–20", text: "Go therefore and make disciples of all nations… and behold, I am with you always, to the end of the age." }],
    crossRefs: ["Acts 1"],
  },
  "Mark 9": {
    summary: "On a high mountain Jesus is transfigured before Peter, James, and John — clothes shining white. Moses and Elijah appear; a cloud; a voice: this is my beloved Son.",
    verses: [{ ref: "9:7", text: "This is my beloved Son; listen to him." }],
    crossRefs: ["Matt 17", "2 Pet 1"],
  },
  "Mark 15": {
    summary: "Jesus is condemned, mocked, and crucified between two criminals. At the moment of his death the temple curtain tears in two.",
    verses: [{ ref: "15:39", text: "Truly this man was the Son of God!" }],
    crossRefs: ["Ps 22", "Isa 53"],
  },
  "Luke 2": {
    summary: "A baby is born in Bethlehem and laid in a manger. Angels announce good news of great joy to shepherds in the field.",
    verses: [{ ref: "2:11", text: "For unto you is born this day in the city of David a Savior, who is Christ the Lord." }],
    crossRefs: ["Matt 1", "Mic 5"],
  },
  "Luke 15": {
    summary: "Three parables of lost things — a sheep, a coin, and a son — and a Father who runs to meet the one who comes home.",
    verses: [{ ref: "15:20", text: "While he was still a long way off, his father saw him and felt compassion, and ran…" }],
  },
  "Luke 24": {
    summary: "Two disciples walk to Emmaus, hearts heavy. Jesus joins them unrecognized, opens the scriptures, and is finally known in the breaking of bread.",
    verses: [{ ref: "24:32", text: "Did not our hearts burn within us while he talked to us on the road?" }],
  },
  "John 1": {
    summary: "In the beginning was the Word, and the Word was with God. The Word became flesh and dwelt among us, full of grace and truth.",
    verses: [{ ref: "1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God." }, { ref: "1:14", text: "And the Word became flesh and dwelt among us." }],
    crossRefs: ["Gen 1", "Col 1"],
  },
  "John 3": {
    summary: "Nicodemus comes by night. Jesus says you must be born again — and gives the verse the world knows: for God so loved the world.",
    verses: [{ ref: "3:16", text: "For God so loved the world, that he gave his only Son…" }],
  },
  "John 14": {
    summary: "Let not your hearts be troubled. In my Father's house are many rooms. I am the way, and the truth, and the life.",
    verses: [{ ref: "14:6", text: "I am the way, and the truth, and the life. No one comes to the Father except through me." }],
  },
  "John 17": {
    summary: "Jesus' high priestly prayer — for himself, for his disciples, and for all who would believe through their word, that they may all be one.",
    verses: [{ ref: "17:21", text: "That they may all be one, just as you, Father, are in me, and I in you…" }],
  },
  "Acts 2": {
    summary: "On the day of Pentecost, the Spirit comes with sound and fire. Peter preaches; three thousand are baptized; the church is born.",
    verses: [{ ref: "2:38", text: "Repent and be baptized every one of you in the name of Jesus Christ for the forgiveness of your sins…" }],
    crossRefs: ["Joel 2"],
  },
  "Acts 9": {
    summary: "Saul, breathing threats, is struck down on the road to Damascus. A blinding light, a voice, three days dark — and the church's chief persecutor becomes its great apostle.",
    verses: [{ ref: "9:5", text: "I am Jesus, whom you are persecuting." }],
  },
  "Rom 8": {
    summary: "There is therefore now no condemnation. The Spirit of God dwells in you. Nothing — not death, not life, not anything — can separate us from the love of God in Christ.",
    verses: [{ ref: "8:1", text: "There is therefore now no condemnation for those who are in Christ Jesus." }, { ref: "8:38–39", text: "Neither death nor life… will be able to separate us from the love of God in Christ Jesus our Lord." }],
  },
  "Rom 12": {
    summary: "Present your bodies as a living sacrifice. Be transformed by the renewing of your mind. Love that is genuine; bless those who persecute you; overcome evil with good.",
    verses: [{ ref: "12:1", text: "Present your bodies as a living sacrifice, holy and acceptable to God, which is your spiritual worship." }],
  },
  "1 Cor 1": {
    summary: "Paul addresses divisions in the church and lifts up the foolishness of the cross — God's wisdom, hidden in what the world calls weakness.",
    verses: [{ ref: "1:18", text: "For the word of the cross is folly to those who are perishing, but to us who are being saved it is the power of God." }],
  },
  "1 Cor 2": {
    summary: "Paul came not with lofty speech but knowing nothing except Jesus Christ and him crucified. We have the mind of Christ.",
    verses: [{ ref: "2:2", text: "I decided to know nothing among you except Jesus Christ and him crucified." }],
  },
  "1 Cor 13": {
    summary: "Without love, everything else is noise. Love is patient, love is kind. Now we see in a mirror dimly — but then face to face.",
    verses: [{ ref: "13:4", text: "Love is patient and kind…" }, { ref: "13:13", text: "So now faith, hope, and love abide, these three; but the greatest of these is love." }],
  },
  "1 Cor 15": {
    summary: "If Christ has not been raised, our faith is in vain. But in fact Christ has been raised — the firstfruits of those who have fallen asleep.",
    verses: [{ ref: "15:55", text: "O death, where is your victory? O death, where is your sting?" }],
  },
  "2 Cor 4": {
    summary: "We have this treasure in jars of clay, that the surpassing power belongs to God. We are afflicted but not crushed; the inner self is being renewed day by day.",
    verses: [{ ref: "4:7", text: "But we have this treasure in jars of clay, to show that the surpassing power belongs to God and not to us." }],
  },
  "Gal 5": {
    summary: "For freedom Christ has set us free. Walk by the Spirit and the fruit of the Spirit will grow — love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.",
    verses: [{ ref: "5:22–23", text: "But the fruit of the Spirit is love, joy, peace, patience, kindness…" }],
  },
  "Eph 2": {
    summary: "You were dead in trespasses; God, rich in mercy, made us alive together with Christ. By grace you have been saved through faith — not your doing, it is the gift of God.",
    verses: [{ ref: "2:8–9", text: "For by grace you have been saved through faith. And this is not your own doing; it is the gift of God." }],
  },
  "Eph 6": {
    summary: "Be strong in the Lord. Put on the whole armor of God — truth, righteousness, peace, faith, salvation, the word — to stand against the schemes of the devil.",
    verses: [{ ref: "6:11", text: "Put on the whole armor of God, that you may be able to stand against the schemes of the devil." }],
  },
  "Phil 2": {
    summary: "Have this mind among yourselves: Christ Jesus, who though in the form of God, emptied himself, took the form of a servant, and became obedient to death — even death on a cross.",
    verses: [{ ref: "2:8", text: "He humbled himself by becoming obedient to the point of death, even death on a cross." }],
  },
  "Phil 4": {
    summary: "Rejoice in the Lord always; do not be anxious about anything. I have learned the secret of contentment — I can do all things through him who strengthens me.",
    verses: [{ ref: "4:6–7", text: "Do not be anxious about anything… and the peace of God, which surpasses all understanding, will guard your hearts." }],
  },
  "Col 1": {
    summary: "Christ is the image of the invisible God, the firstborn of all creation. In him all things hold together. Through him God reconciles all things to himself.",
    verses: [{ ref: "1:17", text: "And he is before all things, and in him all things hold together." }],
  },
  "Heb 11": {
    summary: "By faith — Abel, Enoch, Noah, Abraham, Sarah, Moses, Rahab, and a great cloud of others. Faith is the assurance of things hoped for, the conviction of things not seen.",
    verses: [{ ref: "11:1", text: "Now faith is the assurance of things hoped for, the conviction of things not seen." }],
    crossRefs: ["Heb 12"],
  },
  "Heb 12": {
    summary: "Surrounded by such a great cloud of witnesses — let us run with endurance the race set before us, looking to Jesus, the founder and perfecter of our faith.",
    verses: [{ ref: "12:1–2", text: "Let us run with endurance the race that is set before us, looking to Jesus…" }],
  },
  "Jas 1": {
    summary: "Count it all joy when you meet trials. Ask for wisdom. Be quick to listen, slow to speak, slow to anger. Be doers of the word and not hearers only.",
    verses: [{ ref: "1:22", text: "But be doers of the word, and not hearers only, deceiving yourselves." }],
  },
  "1 Pet 2": {
    summary: "You are a chosen race, a royal priesthood, a holy nation, a people for his own possession — that you may proclaim the excellencies of him who called you out of darkness.",
    verses: [{ ref: "2:9", text: "But you are a chosen race, a royal priesthood, a holy nation, a people for his own possession…" }],
  },
  "1 Jn 4": {
    summary: "Beloved, let us love one another, for love is from God. Whoever does not love does not know God, because God is love. There is no fear in love.",
    verses: [{ ref: "4:8", text: "Anyone who does not love does not know God, because God is love." }, { ref: "4:18", text: "There is no fear in love, but perfect love casts out fear." }],
  },
  "Rev 4": {
    summary: "A door stands open in heaven. John sees a throne, and one seated on it. Around the throne, creatures and elders never cease: holy, holy, holy.",
    verses: [{ ref: "4:8", text: "Holy, holy, holy, is the Lord God Almighty, who was and is and is to come!" }],
    crossRefs: ["Isa 6"],
  },
  "Rev 21": {
    summary: "A new heaven and a new earth. The dwelling of God is with man. He will wipe away every tear; death shall be no more, neither shall there be mourning, nor crying, nor pain.",
    verses: [{ ref: "21:4", text: "He will wipe away every tear from their eyes, and death shall be no more…" }],
    crossRefs: ["Isa 65"],
  },
  "Rev 22": {
    summary: "The river of the water of life. The tree of life. No more curse. The Spirit and the Bride say, Come. Surely I am coming soon.",
    verses: [{ ref: "22:20", text: "He who testifies to these things says, 'Surely I am coming soon.' Amen. Come, Lord Jesus!" }],
  },
};

// Reflection prompts by category — chosen by chapter id so the same chapter
// keeps the same prompt across visits.
const REFLECTION_PROMPTS = {
  law: [
    "What does this passage reveal about who God is?",
    "What pattern of life is being shaped here?",
    "Where does this expose something I've been getting wrong?",
  ],
  history: [
    "Where do you see God's hand in seemingly ordinary moments?",
    "Whose faith stands out in this story — and why?",
    "What did the people remember? What did they forget?",
  ],
  wisdom: [
    "Which line will you carry with you today?",
    "What does this passage say about the good life?",
    "Where does this gently disagree with how the world tells you to live?",
  ],
  poetry: [
    "What emotion does the writer give voice to that you've also felt?",
    "Read it aloud. What word lingers?",
    "Whom would you pray this for?",
  ],
  prophecy: [
    "What is God still saying through these words?",
    "Where is the call to repent — and where the promise of hope?",
    "What does this say about how God sees nations and power?",
  ],
  gospel: [
    "What does this scene reveal about Jesus?",
    "What does Jesus do here that surprises you?",
    "Which person in the story do you recognize yourself in?",
  ],
  epistle: [
    "What's one thing this passage asks you to live differently?",
    "How does this connect who you are to what you do?",
    "Which sentence would you write on your wall?",
  ],
  revelation: [
    "What hope does this give you for what's coming?",
    "What does this image of heaven invite you to long for?",
    "How might today look different if this is really the end of the story?",
  ],
};

function pickReflection(chapterId, category) {
  const prompts = REFLECTION_PROMPTS[category] || REFLECTION_PROMPTS.gospel;
  // simple stable hash so the prompt is consistent for a given chapter
  let h = 0;
  for (let i = 0; i < chapterId.length; i++) h = (h * 31 + chapterId.charCodeAt(i)) | 0;
  return prompts[Math.abs(h) % prompts.length];
}

// Approximate reading time in minutes for a chapter, based on per-book
// average word counts (sourced from publicly known Bible word-count tables,
// rounded). Returns a small range like "~ 4 min".
const BOOK_AVG_WORDS_PER_CHAPTER = {
  // OT, rough averages
  "Genesis": 770, "Exodus": 800, "Leviticus": 920, "Numbers": 910, "Deuteronomy": 800,
  "Joshua": 760, "Judges": 870, "Ruth": 620, "1 Samuel": 820, "2 Samuel": 800,
  "1 Kings": 1080, "2 Kings": 920, "1 Chronicles": 720, "2 Chronicles": 700, "Ezra": 720,
  "Nehemiah": 820, "Esther": 580, "Job": 280, "Psalms": 130, "Proverbs": 510,
  "Ecclesiastes": 470, "Song of Solomon": 380, "Isaiah": 560, "Jeremiah": 820,
  "Lamentations": 700, "Ezekiel": 800, "Daniel": 980, "Hosea": 350, "Joel": 730,
  "Amos": 460, "Obadiah": 670, "Jonah": 320, "Micah": 470, "Nahum": 290,
  "Habakkuk": 230, "Zephaniah": 410, "Haggai": 310, "Zechariah": 470, "Malachi": 310,
  // NT
  "Matthew": 670, "Mark": 940, "Luke": 800, "John": 730, "Acts": 660,
  "Romans": 460, "1 Corinthians": 440, "2 Corinthians": 360, "Galatians": 380,
  "Ephesians": 410, "Philippians": 410, "Colossians": 400, "1 Thessalonians": 280,
  "2 Thessalonians": 280, "1 Timothy": 290, "2 Timothy": 320, "Titus": 220,
  "Philemon": 380, "Hebrews": 460, "James": 350, "1 Peter": 410, "2 Peter": 350,
  "1 John": 380, "2 John": 230, "3 John": 200, "Jude": 460, "Revelation": 540,
};

function readingMinutes(book) {
  const w = BOOK_AVG_WORDS_PER_CHAPTER[book] || 500;
  const m = Math.max(1, Math.round(w / 200));
  return m;
}

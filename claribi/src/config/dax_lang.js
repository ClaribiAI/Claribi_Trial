// src/dax-language.js

export const dax = (Prism) => {
  Prism.languages.dax = {
    'comment': {
      pattern: /(\/\/.*)|(\/\*[\s\S]*?(?:\*\/|$))/,
      greedy: true,
    },
  
    // RULE #1 (HIGHEST PRIORITY): Match the full 'Table Name'[Column Name] pattern.
    // This rule is checked first and will correctly consume the entire identifier.
    'table-column': {
      pattern: /'[^'\r\n]+'\[[^\]\r\n]+\]/,
      greedy: true,
      alias: 'class-name', // Use a distinct alias to style it differently from strings.
    },
  
    // RULE #2: Match standalone [Measure Name] or [Column Name] patterns.
    'measure': {
      pattern: /\[[^\]\r\n]+\]/,
      greedy: true,
      alias: 'variable',
    },
  
    // RULE #3: Match "double-quoted strings" used for text values in DAX.
    'string': {
      pattern: /"(""|[^"\r\n])*"/,
      greedy: true,
    },
    
    // RULE #4: A comprehensive list of all major DAX keywords and functions.
    'keyword': {
      pattern: new RegExp(
        '\\b(' +
        // Core Keywords & Operators
        'VAR|RETURN|EVALUATE|DEFINE|MEASURE|ORDER|BY|START|AT|IN|IF|TRUE|FALSE|BLANK|' +
        'AND|OR|NOT|SWITCH|' +
        // Filter & Relationship
        'ALL|ALLEXCEPT|ALLNOBLANKROW|ALLSELECTED|CALCULATE|CALCULATETABLE|CROSSFILTER|' +
        'DISTINCT|EARLIER|EARLIEST|FILTER|KEEPFILTERS|LOOKUPVALUE|RELATED|RELATEDTABLE|' +
        'REMOVEFILTERS|USERELATIONSHIP|' +
        // Aggregators & Iterators
        'SUM|SUMX|AVERAGE|AVERAGEA|AVERAGEX|COUNT|COUNTA|COUNTAX|COUNTBLANK|COUNTROWS|' +
        'DISTINCTCOUNT|MAX|MAXA|MAXX|MIN|MINA|MINX|RANKX|' +
        // Time Intelligence
        'DATE|DATEDIFF|NOW|TODAY|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|EOMONTH|' +
        'STARTOFMONTH|ENDOFMONTH|DATESYTD|DATESQTD|DATESMTD|TOTALYTD|TOTALQTD|TOTALMTD|' +
        'SAMEPERIODLASTYEAR|PARALLELPERIOD|NEXTDAY|NEXTMONTH|NEXTQUARTER|NEXTYEAR|' +
        'PREVIOUSDAY|PREVIOUSMONTH|PREVIOUSQUARTER|PREVIOUSYEAR|DATESBETWEEN|DATESINPERIOD|' +
        // Text Functions
        'CONCATENATE|CONCATENATEX|EXACT|FIND|FIXED|FORMAT|LEFT|LEN|LOWER|MID|' +
        'REPLACE|REPT|RIGHT|SEARCH|SUBSTITUTE|TRIM|UPPER|VALUE|' +
        // Table Manipulation & Other
        'ADDCOLUMNS|CROSSJOIN|GENERATESERIES|GROUPBY|HASONEVALUE|ISBLANK|ISCROSSFILTERED|' +
        'ISFILTERED|NATURALINNERJOIN|NATURALLEFTOUTERJOIN|SELECTEDVALUE|SUMMARIZE|' +
        'SUMMARIZECOLUMNS|TOPN|TREATAS|UNION|VALUES' +
        ')\\b',
        'i' // Case-insensitive flag
      ),
    },
    
    // RULE #5: A fallback for any function-like pattern not in the keyword list.
    'function': {
      pattern: /\b[A-Z_][A-Z0-9_.]+\b(?=\s*\()/i,
    },
  
    'operator': /(&&|\|\||[-+*\/<>]=?|[=^])/,
    'number': /\b\d+(\.\d+)?\b/,
    'punctuation': /[(),.]/,
  };
};
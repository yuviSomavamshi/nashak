![alt text](http://www.americancinemathequecalendar.com/sites/default/files/stills_events_390_240/conan_the_barbarian_390.jpg?1432677405 "Logo Title Text 1")

# nashak
nashak is someone or something that **destroys**.  In the true spirit of software testing, 
a tester or a test program must destroy or annihilate the software to a great extent
such that the developer shall have a tough time and uphill task to make it up again.


# Introduction
nashak is a test automation software by the developers, for the developers.
nashak allows you to define your testcases in an excel file using a 
Behavior Driven Testing paradigm.  You define your test cases using the
popular "given", "when", "then" format along with a few additional columns, 
which define the input payload, expected response, and a module.function name
that executes the test case.  

That's it. You are ready to go...


# Philosophy
This tool assumes that you know behavior-driven testing concept, a.k.a Given-When-Then.
If you are new to given-when-then, see these links:
- https://martinfowler.com/bliki/GivenWhenThen.html
- https://solidsoft.wordpress.com/2017/05/16/importance-of-given-when-then-in-unit-tests-and-tdd/
- https://blog.codecentric.de/en/2017/09/given-when-then-in-junit-tests/

Below is a sample of how to write test cases in excel using g-w-t format.
![](images/excel-sample.png)

You essentially need to have these mandatory columns and contents as explained below:
- id => identifies the test case number.  This should be a running serial number without overlaps or breaks
- given => The test case scenario (part of the given-when-then trio).
- when => the event or 'when' part of the gwt
- then => the 'then' part of gwt
- input payload => The test case input (currently supported is json format) for this test case
- expected result => the expected output from test case execution 
- executor => the javascript /nodejs module file and the exported function therein. 

# Quick Start
## Install

```bash
npm install --save nashak
```

## Basic Usage
```javascript
const nashak = require('nashak');
const opts = Object.assign({}, args, {
    startRow: 1,            // start execution from row 1
    endRow: 100,            // execute test cases until row 100
    
    // Columns layout
    givenColumnNo: 2,         // our given column is 2nd
    whenColumnNo: 3,          // when is 3rd
    thenColumnNo: 4,          // then is 4th
    inputColumnNo: 5,         // input payload is at 5th
    expectedColumnNo: 6,      // expected result at 6th; and
    executorColumnNo: 7       // executor at 7th
});

var excelFile = "./test-cases.xlsx";
nashak.run(excelFile, opts)
    .then(() => {
        console.log("Successfully finished execution.");
    })
    .catch((e) => {
        console.error("Some failure while executing test cases:", e);
    })
```


# Features
nashak is a test runner that executes any number of test cases defined 
in a Microsft xlsx file.
1. Run all test cases in the defined order in the excel file.
2. Run a specific test case by row number.
3. Run a range of test cases by providing start and end rows

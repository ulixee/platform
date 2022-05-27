## 2.5 Live Scripting
The HeroScript panel shows your “code” as it directly relates to each moment in your script. You can currently use it to navigate. We would like to enhance this panel to show you the output of each Hero “command”, in addition to enabling you to iteratively “play” to the latest line of code in your script during development.

- HeroScript Step Input/Output (side panel with command details)
- Play-to-latest line of code in the Script

## 2.9 Reliability Testing
As you iterate on your script, we can get a picture of the variety of inputs, IP addresses and edge cases your script is handling. We would like to formalize some of this process of “hardening” and testing stability.

- Extraction “Test Suites” - create a series of collected assets from many sessions that form the basis of a test suite used for testing as your iterate on extraction logic.
- IP testing - handle edge cases when a script uses a purposefully bad IP address that triggers overloads, blocked IPs, etc

## 2.11 Developer Code Assistance
We want to super-charge Chrome with the information needed to speed up writing scripts and improve reliability. We imagine supplementing Elements with an ability to see how classes and selectors change across runs. As query selectors break, we can inform the developer of more stable query selectors. Our DOM recording allows us to highlight changes across each moment of the timeline with an ability to recommend a waitForState code block. During extraction, we can use many runs to detect changing content and recommend query selectors.

- Selector Generator - enhance for multiple session stability detection
- State Generator - to see changing resources and storage at each moment in the timeline
- Dom Shaking - to extract changing content across similar structures
- Notifications of anti-bot detector code within website being scraped

@echo off
rem ---------------------------------------------------------------
rem PJ1 Phase 1 - CLI SVG editor launcher (Windows convenience)
rem
rem Use this when PowerShell blocks npm.ps1:
rem   "npm : cannot load file ... because running scripts is disabled"
rem It is equivalent to `npm run cli` and needs nothing but Node.js.
rem Double-click this file, or run it from any terminal.
rem ---------------------------------------------------------------
cd /d "%~dp0"
node src\cli\main.ts

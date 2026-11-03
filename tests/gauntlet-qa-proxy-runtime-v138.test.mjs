import test from "node:test";
import assert from "node:assert/strict";
import { proxy, config } from "../proxy.ts";

test("Private gauntlet QA proxy returns actual 404 without local opt-in and on Vercel",()=>{
  const originalOptIn=process.env.YAUTJA_LOCAL_VISUAL_QA_V90;
  const originalVercel=process.env.VERCEL;
  try{
    delete process.env.YAUTJA_LOCAL_VISUAL_QA_V90;
    delete process.env.VERCEL;
    let response=proxy();
    assert.equal(response.status,404);
    assert.match(response.headers.get("X-Robots-Tag")??"",/noindex, nofollow/i);
    assert.equal(response.headers.get("Cache-Control"),"private, no-store");

    process.env.YAUTJA_LOCAL_VISUAL_QA_V90="0";
    response=proxy();
    assert.equal(response.status,404,"Explicit zero must never allow the QA page");

    process.env.YAUTJA_LOCAL_VISUAL_QA_V90="1";
    response=proxy();
    assert.equal(response.status,200,"Local explicit opt-in should allow the route to reach the server page");

    process.env.VERCEL="1";
    response=proxy();
    assert.equal(response.status,404,"Vercel deployment must reject even with local opt-in");
  } finally{
    if(originalOptIn===undefined)delete process.env.YAUTJA_LOCAL_VISUAL_QA_V90;
    else process.env.YAUTJA_LOCAL_VISUAL_QA_V90=originalOptIn;
    if(originalVercel===undefined)delete process.env.VERCEL;
    else process.env.VERCEL=originalVercel;
  }
});

test("Private early middleware matches both gauntlet labs, not game or actual sprites",()=>{
  const matcher=config.matcher;
  assert.ok(matcher.includes("/gauntlet-qa-v135/:path*"));
  assert.ok(matcher.includes("/gauntlet-qa-v136/:path*"));
  assert.ok(!matcher.some(x=>x.startsWith("/game/")));
  assert.ok(!matcher.some(x=>x.startsWith("/api/")));
});

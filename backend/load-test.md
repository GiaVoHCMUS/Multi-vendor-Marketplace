# 1. Rate Limit Test

```bash
D:\MultivendorMarketplace\backend>k6 run tests/load/rate-limit-test.js

         /\      Grafana   /‾‾/  
    /\  /  \     |\  __   /  /   
   /  \/    \    | |/ /  /   ‾‾\ 
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/ 


     execution: local
        script: tests/load/rate-limit-test.js
        output: -

     scenarios: (100.00%) 1 scenario, 10 max VUs, 45s max duration (incl. graceful stop):
              * spam_public_api: 10 looping VUs for 15s (exec: spamPublicApi, gracefulStop: 30s)



  █ THRESHOLDS 

    http_req_failed
    ✓ 'rate>0.5' rate=98.00%


  █ TOTAL RESULTS 

    checks_total.......: 30069  2002.877605/s
    checks_succeeded...: 33.33% 10023 out of 30069
    checks_failed......: 66.66% 20046 out of 30069

    ✗ Status 200 (Passed Limiter)
      ↳  1% — ✓ 200 / ✗ 9823
    ✗ Status 429 (Rate Limited)
      ↳  98% — ✓ 9823 / ✗ 200
    ✗ Status 500 (Internal Server Error)
      ↳  0% — ✓ 0 / ✗ 10023

    HTTP
    http_req_duration..............: avg=4.42ms  min=504.7µs med=3.24ms  max=551.59ms p(90)=6.13ms  p(95)=7.68ms 
      { expected_response:true }...: avg=33.82ms min=3.93ms  med=6.52ms  max=551.59ms p(90)=9.93ms  p(95)=40.02ms
    http_req_failed................: 98.00% 9823 out of 10023
    http_reqs......................: 10023  667.625868/s

    EXECUTION
    iteration_duration.............: avg=14.96ms min=10.55ms med=13.69ms max=569.98ms p(90)=16.66ms p(95)=18.48ms
    iterations.....................: 10023  667.625868/s
    vus............................: 10     min=10            max=10
    vus_max........................: 10     min=10            max=10

    NETWORK
    data_received..................: 5.5 MB 364 kB/s
    data_sent......................: 822 kB 55 kB/s




running (15.0s), 00/10 VUs, 10023 complete and 0 interrupted iterations
spam_public_api ✓ [======================================] 10 VUs  15s
```

# 2. Redis Cache Test
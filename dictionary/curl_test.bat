curl -X GET "http://localhost:8000/lookup/%EA%B0%80" | jq 


curl -X GET "http://localhost:8000/lookup/-가" | jq 


curl -i -X GET "http://localhost:8000/lookup/없는단어" | jq 


curl -X GET "http://localhost:8000/prefix/가" | jq 


curl -X GET "http://localhost:8000/prefix/가?limit=5" | jq 



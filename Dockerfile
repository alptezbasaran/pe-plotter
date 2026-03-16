# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p public && \
    for f in *.txt; do [ -f "$f" ] && cp "$f" "public/$f"; done && \
    ls public/*.txt 2>/dev/null | sed 's|^public/||' | sort > /tmp/list.txt && \
    printf '[\n' > public/files.json && \
    first=1; while IFS= read -r name; do \
      [ "$first" = 1 ] && first=0 || printf ',\n' >> public/files.json; \
      printf '  "%s"' "$name" >> public/files.json; \
    done < /tmp/list.txt && \
    printf '\n]\n' >> public/files.json
RUN npm run build

# Stage 2: Serve
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

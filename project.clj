(defproject markdown-clj "0.7"
    :description "Markdown parser"
    :dependencies [[org.clojure/clojure "1.4.0"]]
    :plugins [[lein-cljsbuild "0.1.8"]]
    
    :cljsbuild
    {:crossovers [transformers],
     :builds
     [{:source-path "src-cljs",
       :crossover-path src-cljs,
       :optimizations :advanced
       :compiler {:output-to "js/markdown.js"}}]})

